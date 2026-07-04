"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkContactLimit, type PlanTier } from "@/lib/plans";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import { normalizeContactPhone } from "@/lib/phone-numbers";

const createContactSchema = z.object({
  email: z.string().email("Email invalide"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  tags: z.string().optional(),
});

export async function createContact(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    email: formData.get("email") as string,
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    phone: formData.get("phone") as string,
    tags: formData.get("tags") as string,
  };

  const result = createContactSchema.safeParse(raw);
  if (!result.success) {
    return {
      error: "Donnees invalides",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const data = result.data;

  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: "Utilisateur non trouve. Connectez-vous d'abord." };
    }

    // Check contact limit
    const contactCheck = await checkContactLimit(org.id, org.plan as PlanTier);
    if (!contactCheck.allowed) {
      return { error: `Limite de contacts atteinte (${contactCheck.limit}). Passez au plan Pro pour plus de contacts.` };
    }

    const contact = await prisma.contact.create({
      data: {
        email: data.email,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phone: normalizeContactPhone(data.phone) || null,
        userId: user.id,
        organizationId: org.id,
      },
    });

    if (data.tags) {
      const tagNames = data.tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagNames.length > 0) {
        await prisma.contactTag.createMany({
          data: tagNames.map((name) => ({ name, contactId: contact.id })),
        });
      }
    }

    trackServerEvent(user.id, EVENTS.CONTACT_CREATED, { email: data.email }, org.id);

    // Sync to Convex activity feed
    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "created",
      resourceType: "contact",
      resourceId: contact.id,
      resourceName: data.email,
    });

    revalidatePath("/dashboard/contacts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { error: "Ce contact existe deja dans votre organisation." };
    }
    return { error: "Erreur lors de la creation du contact." };
  }
}

export async function importContacts(
  contacts: { email: string; firstName: string; lastName: string; phone: string; tags: string }[]
): Promise<ActionState & { imported?: number; skipped?: number }> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) return { error: "Non authentifie." };

    // Check plan limit
    const contactCheck = await checkContactLimit(org.id, org.plan as PlanTier);
    if (!contactCheck.allowed) {
      return { error: `Limite de contacts atteinte (${contactCheck.limit}). Passez au plan Pro.` };
    }
    const remaining = contactCheck.limit === -1 ? Infinity : contactCheck.limit - contactCheck.current;
    const toImport = contacts.slice(0, remaining);

    if (toImport.length === 0) {
      return { error: "Aucun contact valide a importer." };
    }

    // Bulk create contacts (skipDuplicates ignores existing email+org combos)
    const result = await prisma.contact.createMany({
      data: toImport.map((c) => ({
        email: c.email.toLowerCase().trim(),
        firstName: c.firstName || null,
        lastName: c.lastName || null,
        phone: normalizeContactPhone(c.phone) || null,
        userId: user.id,
        organizationId: org.id,
      })),
      skipDuplicates: true,
    });

    // Create tags for imported contacts that have tags
    const contactsWithTags = toImport.filter((c) => c.tags);
    if (contactsWithTags.length > 0) {
      for (const c of contactsWithTags) {
        const tagNames = c.tags.split(",").map((t) => t.trim()).filter(Boolean);
        if (tagNames.length === 0) continue;
        const contact = await prisma.contact.findFirst({
          where: { email: c.email.toLowerCase().trim(), organizationId: org.id },
          select: { id: true },
        });
        if (contact) {
          await prisma.contactTag.createMany({
            data: tagNames.map((name) => ({ name, contactId: contact.id })),
            skipDuplicates: true,
          });
        }
      }
    }

    const skipped = toImport.length - result.count;

    trackServerEvent(user.id, "contacts_imported", {
      imported: result.count,
      skipped,
      total: contacts.length,
    }, org.id);

    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "created",
      resourceType: "contact",
      resourceId: "bulk-import",
      resourceName: `Import CSV (${result.count} contacts)`,
    });

    revalidatePath("/dashboard/contacts");
    revalidatePath("/dashboard");
    return { success: true, imported: result.count, skipped };
  } catch {
    return { error: "Erreur lors de l'import." };
  }
}

export async function deleteContact(contactId: string): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: "Non authentifié." };
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId, organizationId: org.id },
      select: { email: true, organizationId: true, userId: true },
    });

    if (!contact) {
      return { error: "Contact introuvable." };
    }

    await prisma.contact.delete({ where: { id: contactId, organizationId: org.id } });

    trackServerEvent(contact.userId, EVENTS.CONTACT_DELETED, { email: contact.email }, contact.organizationId);
    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: contact.organizationId,
      userId: contact.userId,
      userName: "System",
      action: "deleted",
      resourceType: "contact",
      resourceId: contactId,
      resourceName: contact.email,
    });

    revalidatePath("/dashboard/contacts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
