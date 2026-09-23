/**
 * Organization-scoped operations on automations and their workflow steps.
 *
 * Each function filters on the caller's organization inside the query itself,
 * so an automation of another organization behaves exactly like an unknown one.
 * The database is injected so the scoping can be exercised in tests.
 */
import { z } from "zod";
import type { AutomationStatus, Prisma } from "@/generated/prisma";

export const AUTOMATION_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "ARCHIVED"] as const satisfies readonly AutomationStatus[];

// Fails to compile if the Prisma enum gains a value this list does not cover.
const everyStatusIsListed: Exclude<AutomationStatus, (typeof AUTOMATION_STATUSES)[number]> extends never ? true : never = true;
void everyStatusIsListed;

const automationStatusSchema = z.enum(AUTOMATION_STATUSES);

export function parseAutomationStatus(raw: unknown): AutomationStatus | null {
  const result = automationStatusSchema.safeParse(raw);
  return result.success ? result.data : null;
}

export const WORKFLOW_MAX_NODES = 200;
export const WORKFLOW_MAX_EDGES = 500;

const workflowNodeSchema = z.object({
  id: z.string().min(1).max(200),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  data: z.object({
    type: z.string().min(1).max(100),
    label: z.string().max(200),
    config: z.record(z.string(), z.json()).default({}),
  }),
});

const workflowEdgeSchema = z.object({
  id: z.string().min(1).max(200),
  source: z.string().min(1).max(200),
  target: z.string().min(1).max(200),
  sourceHandle: z.string().max(200).nullish(),
  targetHandle: z.string().max(200).nullish(),
});

export type WorkflowStepInput = {
  type: string;
  position: number;
  config: Prisma.InputJsonObject;
};

/** Validates the editor payload and turns it into the steps to store. */
export function parseWorkflowPayload(nodesJson: string, edgesJson: string): WorkflowStepInput[] | null {
  let rawNodes: unknown;
  let rawEdges: unknown;
  try {
    rawNodes = JSON.parse(nodesJson);
    rawEdges = JSON.parse(edgesJson);
  } catch {
    return null;
  }

  const nodes = z.array(workflowNodeSchema).max(WORKFLOW_MAX_NODES).safeParse(rawNodes);
  const edges = z.array(workflowEdgeSchema).max(WORKFLOW_MAX_EDGES).safeParse(rawEdges);
  if (!nodes.success || !edges.success) return null;

  const storedEdges = edges.data.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
  }));

  return nodes.data.map((node, index) => ({
    type: node.data.type,
    position: index,
    config: {
      ...node.data.config,
      _nodeId: node.id,
      _label: node.data.label,
      _x: node.position.x,
      _y: node.position.y,
      ...(index === 0 ? { _edges: storedEdges } : {}),
    },
  }));
}

type OrgScopedId = { id: string; organizationId: string };

export type AutomationScopedDb = {
  automation: {
    findFirst(args: {
      where: OrgScopedId;
      select: { name: true; status: true; userId: true };
    }): Promise<{ name: string; status: AutomationStatus; userId: string } | null>;
    updateMany(args: { where: OrgScopedId; data: { status: AutomationStatus } }): Promise<{ count: number }>;
    deleteMany(args: { where: OrgScopedId }): Promise<{ count: number }>;
    count(args: {
      where: { organizationId: string; status: AutomationStatus | { not: AutomationStatus } };
    }): Promise<number>;
  };
  automationStep: {
    deleteMany(args: { where: { automationId: string } }): Promise<{ count: number }>;
    createMany(args: {
      data: Array<{ automationId: string; type: string; position: number; config: Prisma.InputJsonObject }>;
    }): Promise<{ count: number }>;
  };
};

export type AutomationSummary = { name: string; status: AutomationStatus; userId: string };

export async function findOrganizationAutomation(
  db: AutomationScopedDb,
  organizationId: string,
  automationId: string
): Promise<AutomationSummary | null> {
  if (!automationId) return null;
  return db.automation.findFirst({
    where: { id: automationId, organizationId },
    select: { name: true, status: true, userId: true },
  });
}

/**
 * Replaces the steps of an automation of the organization.
 * Run it inside a transaction: the ownership check, the delete and the insert
 * must succeed or fail together.
 */
export async function replaceOrganizationWorkflow(
  db: AutomationScopedDb,
  organizationId: string,
  automationId: string,
  steps: WorkflowStepInput[]
): Promise<boolean> {
  const automation = await findOrganizationAutomation(db, organizationId, automationId);
  if (!automation) return false;

  await db.automationStep.deleteMany({ where: { automationId } });
  if (steps.length > 0) {
    await db.automationStep.createMany({
      data: steps.map((step) => ({ automationId, ...step })),
    });
  }
  return true;
}

export async function setOrganizationAutomationStatus(
  db: AutomationScopedDb,
  organizationId: string,
  automationId: string,
  status: AutomationStatus
): Promise<boolean> {
  if (!automationId) return false;
  const { count } = await db.automation.updateMany({
    where: { id: automationId, organizationId },
    data: { status },
  });
  return count > 0;
}

/** Deletes an automation of the organization and returns what it was, or null. */
export async function deleteOrganizationAutomation(
  db: AutomationScopedDb,
  organizationId: string,
  automationId: string
): Promise<AutomationSummary | null> {
  const automation = await findOrganizationAutomation(db, organizationId, automationId);
  if (!automation) return null;
  const { count } = await db.automation.deleteMany({ where: { id: automationId, organizationId } });
  return count > 0 ? automation : null;
}

export type StatusChangeResult =
  | { ok: true }
  | { ok: false; reason: "not_found" }
  | { ok: false; reason: "limit_reached"; limit: number }
  | { ok: false; reason: "active_limit_reached"; limit: number; activeCount: number };

/**
 * Changes the status of an automation of the organization, enforcing the plan
 * limit on activation. The read, the counts and the write must run in one
 * serializable transaction so two activations cannot both pass the limit.
 *
 * `automationLimit` is the plan's automation limit, -1 for unlimited.
 */
export async function changeOrganizationAutomationStatus(
  db: AutomationScopedDb,
  organizationId: string,
  automationId: string,
  status: AutomationStatus,
  automationLimit: number
): Promise<StatusChangeResult> {
  const current = await findOrganizationAutomation(db, organizationId, automationId);
  if (!current) return { ok: false, reason: "not_found" };

  if (status === "ACTIVE" && automationLimit !== -1) {
    // Reviving an archived automation counts against the plan again.
    if (current.status === "ARCHIVED") {
      const counted = await db.automation.count({ where: { organizationId, status: { not: "ARCHIVED" } } });
      if (counted >= automationLimit) return { ok: false, reason: "limit_reached", limit: automationLimit };
    }
    if (current.status !== "ACTIVE") {
      const activeCount = await db.automation.count({ where: { organizationId, status: "ACTIVE" } });
      if (activeCount >= automationLimit) {
        return { ok: false, reason: "active_limit_reached", limit: automationLimit, activeCount };
      }
    }
  }

  const updated = await setOrganizationAutomationStatus(db, organizationId, automationId, status);
  return updated ? { ok: true } : { ok: false, reason: "not_found" };
}
