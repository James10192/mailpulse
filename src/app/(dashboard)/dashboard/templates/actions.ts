"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkTemplateLimit, type PlanTier } from "@/lib/plans";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";

const templateSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  category: z.string().default("custom"),
  htmlContent: z.string().optional(),
});

export async function createTemplate(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = templateSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    htmlContent: formData.get("htmlContent"),
  });

  if (!result.success) {
    return { error: "Le nom du template est requis." };
  }

  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: "Utilisateur non trouve." };
    }

    // Check template limit
    const templateCheck = await checkTemplateLimit(org.id, org.plan as PlanTier);
    if (!templateCheck.allowed) {
      return { error: `Limite de templates atteinte (${templateCheck.limit}). Passez au plan Pro pour en creer davantage.` };
    }

    await prisma.emailTemplate.create({
      data: {
        name: result.data.name,
        description: result.data.description || null,
        category: result.data.category || "custom",
        htmlContent: result.data.htmlContent || "<p></p>",
        userId: user.id,
        organizationId: org.id,
      },
    });

    trackServerEvent(user.id, EVENTS.TEMPLATE_CREATED, {
      template_name: result.data.name,
      category: result.data.category,
    }, org.id);

    revalidatePath("/dashboard/templates");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la creation du template." };
  }
}

export async function deleteTemplate(
  templateId: string
): Promise<ActionState> {
  try {
    await prisma.emailTemplate.delete({ where: { id: templateId } });
    trackServerEvent("system", EVENTS.TEMPLATE_DELETED, { template_id: templateId });
    revalidatePath("/dashboard/templates");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
