"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import { deleteOrganizationTag } from "@/lib/contacts/tenant-scope";
import { prismaTenantDb } from "@/lib/contacts/prisma-tenant-db";

const tagSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  color: z.string().default("#f97316"),
});

export async function createTag(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = tagSchema.safeParse({
    name: formData.get("name"),
    color: formData.get("color"),
  });
  if (!result.success) return { error: "Nom requis" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  try {
    // Find any contact to attach the tag to (tags require a contactId)
    const contact = await prisma.contact.findFirst({
      where: { organizationId: org.id },
      select: { id: true },
    });

    if (!contact) {
      return { error: "Ajoutez d'abord un contact avant de créer des tags." };
    }

    // Check if tag already exists on this contact
    const existing = await prisma.contactTag.findFirst({
      where: { name: result.data.name, contactId: contact.id },
    });

    if (!existing) {
      await prisma.contactTag.create({
        data: {
          name: result.data.name,
          color: result.data.color,
          contactId: contact.id,
        },
      });
    }

    trackServerEvent(user.id, EVENTS.TAG_CREATED, { tag_name: result.data.name }, org.id);

    revalidatePath("/dashboard/tags");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la création du tag." };
  }
}

export async function deleteTag(tagName: string): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  try {
    const result = await deleteOrganizationTag(prismaTenantDb, org.id, tagName);
    if (!result.ok) return { error: "Tag introuvable." };

    trackServerEvent(user.id, EVENTS.TAG_DELETED, { tag_name: tagName }, org.id);
    revalidatePath("/dashboard/tags");
    return { success: true };
  } catch (error) {
    console.error("[tags] Failed to delete tag", { organizationId: org.id, error });
    return { error: "Erreur lors de la suppression." };
  }
}
