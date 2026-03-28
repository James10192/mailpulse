"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";

const snippetSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
});

const updateSnippetSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  htmlContent: z.string().optional(),
});

export async function createSnippetAndRedirect(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = snippetSchema.safeParse({ name: formData.get("name") });
  if (!result.success) return { error: "Nom requis" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  let snippetId: string;
  try {
    const snippet = await prisma.emailTemplate.create({
      data: {
        name: result.data.name,
        htmlContent: "<p></p>",
        category: "snippet",
        userId: user.id,
        organizationId: org.id,
      },
    });
    snippetId = snippet.id;
  } catch {
    return { error: "Erreur lors de la creation." };
  }

  redirect(`/dashboard/snippets/${snippetId}/edit`);
}

export async function updateSnippet(
  id: string,
  data: { name?: string; description?: string; htmlContent?: string }
): Promise<ActionState> {
  const result = updateSnippetSchema.safeParse(data);
  if (!result.success) return { error: "Donnees invalides" };

  try {
    await prisma.emailTemplate.update({
      where: { id },
      data: {
        ...(result.data.name && { name: result.data.name }),
        ...(result.data.description !== undefined && { description: result.data.description }),
        ...(result.data.htmlContent !== undefined && { htmlContent: result.data.htmlContent }),
      },
    });
    revalidatePath("/dashboard/snippets");
    revalidatePath(`/dashboard/snippets/${id}/edit`);
    return { success: true };
  } catch {
    return { error: "Erreur lors de la sauvegarde." };
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
