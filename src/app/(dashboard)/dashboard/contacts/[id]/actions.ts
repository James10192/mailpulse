"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import type { ActionState } from "@/types/action-state";

export async function toggleContactSubscription(
  contactId: string
): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: "Utilisateur non trouve." };
    }

    const contact = await prisma.contact.findUnique({
      where: { id: contactId, organizationId: org.id },
      select: { subscribed: true, email: true },
    });

    if (!contact) {
      return { error: "Contact introuvable." };
    }

    const newSubscribed = !contact.subscribed;

    await prisma.contact.update({
      where: { id: contactId },
      data: { subscribed: newSubscribed },
    });

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
  } catch {
    return { error: "Erreur lors de la mise a jour." };
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
    if (!user || !org) return { error: "Non authentifie." };

    await prisma.contact.update({
      where: { id: contactId, organizationId: org.id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName || null }),
        ...(data.lastName !== undefined && { lastName: data.lastName || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.metadata !== undefined && { metadata: data.metadata as object }),
      },
    });

    revalidatePath(`/dashboard/contacts/${contactId}`);
    revalidatePath("/dashboard/contacts");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la mise a jour." };
  }
}

export async function addTagToContact(
  contactId: string,
  tagName: string
): Promise<ActionState> {
  try {
    const { org } = await getCurrentUserAndOrg();
    if (!org) return { error: "Non authentifie." };

    await prisma.contactTag.create({
      data: { name: tagName, contactId },
    });

    revalidatePath(`/dashboard/contacts/${contactId}`);
    return { success: true };
  } catch {
    return { error: "Ce tag existe deja." };
  }
}

export async function removeTagFromContact(
  contactId: string,
  tagId: string
): Promise<ActionState> {
  try {
    await prisma.contactTag.delete({ where: { id: tagId } });
    revalidatePath(`/dashboard/contacts/${contactId}`);
    return { success: true };
  } catch {
    return { error: "Erreur." };
  }
}

export async function triggerAutomation(
  contactId: string,
  automationId: string
): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: "Utilisateur non trouve." };
    }

    const [contact, automation] = await Promise.all([
      prisma.contact.findUnique({
        where: { id: contactId, organizationId: org.id },
        select: { email: true },
      }),
      prisma.automation.findUnique({
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
  } catch {
    return { error: "Erreur lors du declenchement de l'automation." };
  }
}
