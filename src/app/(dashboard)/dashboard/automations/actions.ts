"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, checkAutomationLimit } from "@/lib/plans";
import { retryOnSerializationFailure } from "@/lib/prisma-errors";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import {
  deleteOrganizationAutomation,
  parseAutomationStatus,
  parseWorkflowPayload,
  replaceOrganizationWorkflow,
  changeOrganizationAutomationStatus,
} from "@/lib/automations/tenant-scope";
import { createAutomationDb } from "@/lib/automations/prisma-automation-db";

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
    return { error: "Données invalides. Vérifiez le nom et le déclencheur." };
  }

  let automationId: string;

  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: NOT_AUTHENTICATED };
    }

    const autoCheck = await checkAutomationLimit(org.id, org.plan);
    if (!autoCheck.allowed) {
      return { error: `Limite d’automations atteinte (${autoCheck.limit}). Passez au plan Pro.` };
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
    return { error: "Erreur lors de la création de l’automation." };
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
    const automationLimit = PLAN_LIMITS[org.plan].automations;
    const result = await retryOnSerializationFailure(() =>
      prisma.$transaction(
        (tx) => changeOrganizationAutomationStatus(createAutomationDb(tx), org.id, automationId, status, automationLimit),
        { isolationLevel: "Serializable" }
      )
    );
    if (!result.ok) {
      if (result.reason === "limit_reached") {
        return { error: `Limite d’automations atteinte (${result.limit}). Passez au plan Pro pour activer plus d’automations.` };
      }
      if (result.reason === "active_limit_reached") {
        return { error: `Vous avez déjà ${result.activeCount} automation(s) active(s). Le plan ${org.plan === "FREE" ? "Starter" : org.plan} permet ${result.limit} automation(s). Passez au Pro.` };
      }
      return { error: AUTOMATION_NOT_FOUND };
    }

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
