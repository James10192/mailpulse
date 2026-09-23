"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkAutomationLimit, type PlanTier } from "@/lib/plans";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import {
  deleteOrganizationAutomation,
  findOrganizationAutomation,
  parseAutomationStatus,
  parseWorkflowPayload,
  replaceOrganizationWorkflow,
  setOrganizationAutomationStatus,
} from "@/lib/automations/tenant-scope";
import { createAutomationDb, prismaAutomationDb } from "@/lib/automations/prisma-automation-db";

const NOT_AUTHENTICATED = "Non authentifié.";
const AUTOMATION_NOT_FOUND = "Automation introuvable.";

const automationSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  trigger: z.enum([
    "SUBSCRIBER_ADDED",
    "TAG_ADDED",
    "CAMPAIGN_OPENED",
    "LINK_CLICKED",
    "DATE_BASED",
    "CUSTOM_EVENT",
  ]),
});

export async function createAutomation(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = automationSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    trigger: formData.get("trigger"),
  });

  if (!result.success) {
    return { error: "Donnees invalides. Verifiez le nom et le declencheur." };
  }

  let automationId: string;

  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: "Utilisateur non trouve." };
    }

    const autoCheck = await checkAutomationLimit(org.id, org.plan as PlanTier);
    if (!autoCheck.allowed) {
      return { error: `Limite d'automations atteinte (${autoCheck.limit}). Passez au plan Pro.` };
    }

    const automation = await prisma.automation.create({
      data: {
        name: result.data.name,
        description: result.data.description || null,
        trigger: result.data.trigger,
        status: "DRAFT",
        userId: user.id,
        organizationId: org.id,
      },
    });

    automationId = automation.id;

    trackServerEvent(user.id, EVENTS.AUTOMATION_CREATED, {
      automation_name: result.data.name,
      trigger: result.data.trigger,
    }, org.id);

    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "created",
      resourceType: "automation",
      resourceId: automation.id,
      resourceName: result.data.name,
    });

    revalidatePath("/dashboard/automations");
  } catch {
    return { error: "Erreur lors de la creation de l'automation." };
  }

  redirect(`/dashboard/automations/${automationId}/edit`);
}

export async function saveWorkflow(
  automationId: string,
  nodesJson: string,
  edgesJson: string
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: NOT_AUTHENTICATED };

  const steps = parseWorkflowPayload(nodesJson, edgesJson);
  if (!steps) return { error: "Workflow invalide." };

  try {
    const saved = await prisma.$transaction((tx) =>
      replaceOrganizationWorkflow(createAutomationDb(tx), org.id, automationId, steps)
    );
    if (!saved) return { error: AUTOMATION_NOT_FOUND };

    trackServerEvent(user.id, EVENTS.WORKFLOW_SAVED, {
      automation_id: automationId,
      node_count: steps.length,
    }, org.id);

    revalidatePath(`/dashboard/automations/${automationId}/edit`);
    return { success: true };
  } catch (error) {
    console.error("[automations] Failed to save workflow", { organizationId: org.id, automationId, error });
    return { error: "Erreur lors de la sauvegarde du workflow." };
  }
}

export async function updateAutomationStatus(
  automationId: string,
  rawStatus: string
): Promise<ActionState> {
  const status = parseAutomationStatus(rawStatus);
  if (!status) return { error: "Statut invalide." };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: NOT_AUTHENTICATED };

  try {
    const current = await findOrganizationAutomation(prismaAutomationDb, org.id, automationId);
    if (!current) return { error: AUTOMATION_NOT_FOUND };

    // Block activating if on FREE plan and already at limit
    if (status === "ACTIVE") {
      const check = await checkAutomationLimit(org.id, org.plan as PlanTier);
      // Only block if it's a new activation (not already active) and limit reached
      const isAlreadyCounted = current.status !== "ARCHIVED";
      if (!isAlreadyCounted && !check.allowed) {
        return { error: `Limite d'automations atteinte (${check.limit}). Passez au plan Pro pour activer plus d'automations.` };
      }
      // If limit is 1 and there's already 1 active (not this one), block
      if (check.limit > 0 && current.status !== "ACTIVE") {
        const activeCount = await prisma.automation.count({
          where: { organizationId: org.id, status: "ACTIVE" },
        });
        if (activeCount >= check.limit) {
          return { error: `Vous avez déjà ${activeCount} automation(s) active(s). Le plan ${org.plan === "FREE" ? "Starter" : org.plan} permet ${check.limit} automation(s). Passez au Pro.` };
        }
      }
    }

    const updated = await setOrganizationAutomationStatus(prismaAutomationDb, org.id, automationId, status);
    if (!updated) return { error: AUTOMATION_NOT_FOUND };

    trackServerEvent(user.id, EVENTS.AUTOMATION_STATUS_CHANGED, {
      automation_id: automationId,
      new_status: status,
    }, org.id);

    revalidatePath("/dashboard/automations");
    revalidatePath(`/dashboard/automations/${automationId}/edit`);
    return { success: true };
  } catch (error) {
    console.error("[automations] Failed to change status", { organizationId: org.id, automationId, error });
    return { error: "Erreur lors du changement de statut." };
  }
}

export async function deleteAutomation(
  automationId: string
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: NOT_AUTHENTICATED };

  try {
    const automation = await prisma.$transaction((tx) =>
      deleteOrganizationAutomation(createAutomationDb(tx), org.id, automationId)
    );
    if (!automation) return { error: AUTOMATION_NOT_FOUND };

    trackServerEvent(user.id, EVENTS.AUTOMATION_DELETED, { automation_name: automation.name }, org.id);
    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "deleted",
      resourceType: "automation",
      resourceId: automationId,
      resourceName: automation.name,
    });

    revalidatePath("/dashboard/automations");
    return { success: true };
  } catch (error) {
    console.error("[automations] Failed to delete automation", { organizationId: org.id, automationId, error });
    return { error: "Erreur lors de la suppression." };
  }
}
