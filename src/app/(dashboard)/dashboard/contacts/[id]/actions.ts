"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import type { ActionState } from "@/types/action-state";
import { normalizeContactPhone } from "@/lib/phone-numbers";
import {
  addTagToOrganizationContact,
  removeTagFromOrganizationContact,
} from "@/lib/contacts/tenant-scope";
import { createTenantDb, prismaTenantDb } from "@/lib/contacts/prisma-tenant-db";

const NOT_AUTHENTICATED = "Non authentifié.";
const CONTACT_NOT_FOUND = "Contact introuvable.";

export async function toggleContactSubscription(
  contactId: string
): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) return { error: NOT_AUTHENTICATED };

    const contact = await prisma.contact.findFirst({
      where: { id: contactId, organizationId: org.id },
      select: { subscribed: true, email: true },
    });

    if (!contact) return { error: CONTACT_NOT_FOUND };

    const newSubscribed = !contact.subscribed;

    const { count } = await prisma.contact.updateMany({
      // Filtering on the value just read makes a concurrent toggle fail instead of being silently undone.
      where: { id: contactId, organizationId: org.id, subscribed: contact.subscribed },
      data: { subscribed: newSubscribed },
    });
    if (count === 0) return { error: "Le contact a été modifié entre-temps. Réessayez." };

    trackServerEvent(
      user.id,
      newSubscribed ? EVENTS.CONTACT_CREATED : EVENTS.CONTACT_DELETED,
      { email: contact.email, action: newSubscribed ? "resubscribed" : "unsubscribed" },
      org.id
    );

    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: newSubscribed ? "resubscribed" : "unsubscribed",
      resourceType: "contact",
      resourceId: contactId,
      resourceName: contact.email,
    });

    revalidatePath(`/dashboard/contacts/${contactId}`);
    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error) {
    console.error("[contacts] Failed to toggle subscription", { contactId, error });
    return { error: "Erreur lors de la mise à jour." };
  }
}

export async function updateContact(
  contactId: string,
  data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) return { error: NOT_AUTHENTICATED };

    const { count } = await prisma.contact.updateMany({
      where: { id: contactId, organizationId: org.id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName || null }),
        ...(data.lastName !== undefined && { lastName: data.lastName || null }),
        ...(data.phone !== undefined && { phone: normalizeContactPhone(data.phone) || null }),
        ...(data.metadata !== undefined && { metadata: data.metadata as object }),
      },
    });
    if (count === 0) return { error: CONTACT_NOT_FOUND };

    revalidatePath(`/dashboard/contacts/${contactId}`);
    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch (error) {
    console.error("[contacts] Failed to update contact", { contactId, error });
    return { error: "Erreur lors de la mise à jour." };
  }
}

export async function addTagToContact(
  contactId: string,
  tagName: string
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: NOT_AUTHENTICATED };

  try {
    // Duplicate check and insert run in one serializable transaction: see addTagToOrganizationContact.
    const result = await prisma.$transaction(
      (tx) => addTagToOrganizationContact(createTenantDb(tx), org.id, contactId, tagName),
      { isolationLevel: "Serializable" }
    );
    if (!result.ok) {
      if (result.reason === "duplicate") return { error: "Ce tag existe déjà." };
      if (result.reason === "invalid") return { error: "Nom de tag invalide." };
      return { error: CONTACT_NOT_FOUND };
    }

    revalidatePath(`/dashboard/contacts/${contactId}`);
    return { success: true };
  } catch (error) {
    console.error("[contacts] Failed to add tag", { organizationId: org.id, contactId, error });
    return { error: "Impossible d'ajouter le tag." };
  }
}

export async function removeTagFromContact(
  contactId: string,
  tagId: string
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: NOT_AUTHENTICATED };

  try {
    const result = await removeTagFromOrganizationContact(prismaTenantDb, org.id, contactId, tagId);
    if (!result.ok) return { error: "Tag introuvable." };

    revalidatePath(`/dashboard/contacts/${contactId}`);
    return { success: true };
  } catch (error) {
    console.error("[contacts] Failed to remove tag", { organizationId: org.id, contactId, tagId, error });
    return { error: "Impossible de retirer le tag." };
  }
}

export async function triggerAutomation(
  contactId: string,
  automationId: string
): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) return { error: NOT_AUTHENTICATED };

    const [contact, automation] = await Promise.all([
      prisma.contact.findFirst({
        where: { id: contactId, organizationId: org.id },
        select: { email: true },
      }),
      prisma.automation.findFirst({
        where: { id: automationId, organizationId: org.id },
        select: { name: true },
      }),
    ]);

    if (!contact || !automation) {
      return { error: "Contact ou automation introuvable." };
    }

    trackServerEvent(
      user.id,
      "automation_triggered",
      {
        contactId,
        automationId,
        contactEmail: contact.email,
        automationName: automation.name,
      },
      org.id
    );

    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "triggered",
      resourceType: "automation",
      resourceId: automationId,
      resourceName: `${automation.name} pour ${contact.email}`,
    });

    return { success: true };
  } catch (error) {
    console.error("[contacts] Failed to trigger automation", { contactId, automationId, error });
    return { error: "Erreur lors du déclenchement de l'automation." };
  }
}
