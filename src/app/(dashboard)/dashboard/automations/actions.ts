"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
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

  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: "Utilisateur non trouve." };
    }

    await prisma.automation.create({
      data: {
        name: result.data.name,
        description: result.data.description || null,
        trigger: result.data.trigger,
        status: "DRAFT",
        userId: user.id,
        organizationId: org.id,
      },
    });

    revalidatePath("/dashboard/automations");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la creation de l'automation." };
  }
}

export async function deleteAutomation(
  automationId: string
): Promise<ActionState> {
  try {
    await prisma.automation.delete({ where: { id: automationId } });
    revalidatePath("/dashboard/automations");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
