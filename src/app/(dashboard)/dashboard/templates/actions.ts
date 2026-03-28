"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";

const templateSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  category: z.string().default("custom"),
  htmlContent: z.string().optional(),
});

export type TemplateActionState = { success?: boolean; error?: string } | null;

export async function createTemplate(
  _prev: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
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

    revalidatePath("/dashboard/templates");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la creation du template." };
  }
}

export async function deleteTemplate(
  templateId: string
): Promise<TemplateActionState> {
  try {
    await prisma.emailTemplate.delete({ where: { id: templateId } });
    revalidatePath("/dashboard/templates");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
