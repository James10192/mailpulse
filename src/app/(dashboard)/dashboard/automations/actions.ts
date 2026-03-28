"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";

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
  try {
    // Delete existing steps
    await prisma.automationStep.deleteMany({ where: { automationId } });

    const nodes = JSON.parse(nodesJson) as Array<{
      id: string;
      position: { x: number; y: number };
      data: { type: string; label: string; config: Record<string, unknown> };
    }>;
    const edges = JSON.parse(edgesJson) as Array<{
      id: string;
      source: string;
      target: string;
      sourceHandle?: string | null;
    }>;

    // Save nodes as steps + store edges in the first step's config
    if (nodes.length > 0) {
      await prisma.automationStep.createMany({
        data: nodes.map((node, index) => ({
          automationId,
          type: node.data.type,
          position: index,
          config: {
            ...node.data.config,
            _nodeId: node.id,
            _label: node.data.label,
            _x: node.position.x,
            _y: node.position.y,
            ...(index === 0 ? { _edges: edges } : {}),
          },
        })),
      });
    }

    revalidatePath(`/dashboard/automations/${automationId}/edit`);
    return { success: true };
  } catch {
    return { error: "Erreur lors de la sauvegarde du workflow." };
  }
}

export async function updateAutomationStatus(
  automationId: string,
  status: string
): Promise<ActionState> {
  try {
    await prisma.automation.update({
      where: { id: automationId },
      data: { status: status as "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED" },
    });
    revalidatePath("/dashboard/automations");
    revalidatePath(`/dashboard/automations/${automationId}/edit`);
    return { success: true };
  } catch {
    return { error: "Erreur lors du changement de statut." };
  }
}

export async function deleteAutomation(
  automationId: string
): Promise<ActionState> {
  try {
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
      select: { name: true, organizationId: true, userId: true },
    });
    await prisma.automation.delete({ where: { id: automationId } });

    if (automation) {
      convexServer.mutation(api.dashboard.logActivity, {
        organizationId: automation.organizationId,
        userId: automation.userId,
        userName: "System",
        action: "deleted",
        resourceType: "automation",
        resourceId: automationId,
        resourceName: automation.name,
      });
    }

    revalidatePath("/dashboard/automations");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
