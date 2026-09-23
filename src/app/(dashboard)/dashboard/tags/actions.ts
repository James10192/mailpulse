"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import { deleteOrganizationTag, normalizeContactTagName } from "@/lib/contacts/tenant-scope";
import { prismaTenantDb } from "@/lib/contacts/prisma-tenant-db";
import { retryOnSerializationFailure } from "@/lib/prisma-errors";

const tagSchema = z.object({
  name: z.string().transform((value, ctx) => {
    const name = normalizeContactTagName(value);
    if (!name) {
      ctx.addIssue({ code: "custom", message: "Nom de tag invalide" });
      return z.NEVER;
    }
    return name;
  }),
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
  if (!result.success) return { error: "Nom de tag invalide." };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  const { name, color } = result.data;
  try {
    // Tags live on contacts: attach the new name to any contact of the organization.
    // No unique index on contact_tag, so check and insert atomically.
    const hasContact = await retryOnSerializationFailure(() =>
      prisma.$transaction(
        async (tx) => {
          const contact = await tx.contact.findFirst({
            where: { organizationId: org.id },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          });
          if (!contact) return false;
          const existing = await tx.contactTag.findFirst({ where: { name, contactId: contact.id }, select: { id: true } });
          if (!existing) await tx.contactTag.create({ data: { name, color, contactId: contact.id } });
          return true;
        },
        { isolationLevel: "Serializable" }
      )
    );
    if (!hasContact) return { error: "Ajoutez d’abord un contact avant de créer des tags." };

    trackServerEvent(user.id, EVENTS.TAG_CREATED, { tag_name: name }, org.id);

    revalidatePath("/dashboard/tags");
    return { success: true };
  } catch (error) {
    console.error("[tags] Failed to create tag", { organizationId: org.id, error });
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
