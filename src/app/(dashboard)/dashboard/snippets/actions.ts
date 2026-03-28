"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";

const snippetSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  htmlContent: z.string().min(1, "Le contenu est requis"),
});

export async function createSnippet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const result = snippetSchema.safeParse({
    name: formData.get("name"),
    htmlContent: formData.get("htmlContent"),
  });
  if (!result.success) return { error: "Nom et contenu requis" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    await prisma.emailTemplate.create({
      data: {
        name: result.data.name,
        htmlContent: result.data.htmlContent,
        category: "snippet",
        userId: user.id,
        organizationId: org.id,
      },
    });
    revalidatePath("/dashboard/snippets");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la creation." };
  }
}

export async function deleteSnippet(id: string): Promise<ActionState> {
  try {
    await prisma.emailTemplate.delete({ where: { id } });
    revalidatePath("/dashboard/snippets");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
