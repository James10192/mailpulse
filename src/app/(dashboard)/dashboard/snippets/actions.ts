"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkSnippetLimit, type PlanTier } from "@/lib/plans";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";

const snippetSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  channel: z.enum(["EMAIL", "WHATSAPP"]).default("EMAIL"),
});

const updateSnippetSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  description: z.string().optional(),
  htmlContent: z.string().optional(),
  channel: z.enum(["EMAIL", "WHATSAPP"]).optional(),
  whatsappImageUrl: z.string().nullable().optional(),
  whatsappImageName: z.string().nullable().optional(),
});

export async function createSnippetAndRedirect(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = snippetSchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel") || "EMAIL",
  });
  if (!result.success) return { error: "Nom requis" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  // Check snippet limit
  const snippetCheck = await checkSnippetLimit(org.id, org.plan as PlanTier);
  if (!snippetCheck.allowed) {
    return { error: `Limite de snippets atteinte (${snippetCheck.limit}). Passez au plan Pro pour en creer davantage.` };
  }

  let snippetId: string;
  try {
    const snippet = await prisma.emailTemplate.create({
      data: {
        name: result.data.name,
        htmlContent: "<p></p>",
        category: "snippet",
        channel: result.data.channel,
        userId: user.id,
        organizationId: org.id,
      },
    });
    snippetId = snippet.id;
    trackServerEvent(user.id, EVENTS.SNIPPET_CREATED, { snippet_name: result.data.name }, org.id);
  } catch {
    return { error: "Erreur lors de la creation." };
  }

  redirect(`/dashboard/snippets/${snippetId}/edit`);
}

export async function updateSnippet(
  id: string,
  data: {
    name?: string;
    description?: string;
    htmlContent?: string;
    channel?: "EMAIL" | "WHATSAPP";
    whatsappImageUrl?: string | null;
    whatsappImageName?: string | null;
  }
): Promise<ActionState> {
  const result = updateSnippetSchema.safeParse(data);
  if (!result.success) return { error: "Donnees invalides" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    await prisma.emailTemplate.update({
      where: { id, organizationId: org.id },
      data: {
        ...(result.data.name !== undefined && { name: result.data.name }),
        ...(result.data.description !== undefined && { description: result.data.description }),
        ...(result.data.htmlContent !== undefined && { htmlContent: result.data.htmlContent }),
        ...(result.data.channel !== undefined && { channel: result.data.channel }),
        ...(result.data.whatsappImageUrl !== undefined && { whatsappImageUrl: result.data.whatsappImageUrl }),
        ...(result.data.whatsappImageName !== undefined && { whatsappImageName: result.data.whatsappImageName }),
      },
    });
    trackServerEvent(user.id, EVENTS.SNIPPET_UPDATED, { snippet_id: id }, org.id);
    revalidatePath("/dashboard/snippets");
    revalidatePath(`/dashboard/snippets/${id}/edit`);
    return { success: true };
  } catch {
    return { error: "Erreur lors de la sauvegarde." };
  }
}

export async function deleteSnippet(id: string): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    await prisma.emailTemplate.delete({ where: { id, organizationId: org.id } });
    trackServerEvent(user.id, EVENTS.SNIPPET_DELETED, { snippet_id: id }, org.id);
    revalidatePath("/dashboard/snippets");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
