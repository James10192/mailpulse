"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";

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

    const contact = await prisma.contact.create({
      data: {
        email: data.email,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        phone: data.phone || null,
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

export async function deleteContact(contactId: string): Promise<ActionState> {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      select: { email: true, organizationId: true, userId: true },
    });
    await prisma.contact.delete({ where: { id: contactId } });

    if (contact) {
      convexServer.mutation(api.dashboard.logActivity, {
        organizationId: contact.organizationId,
        userId: contact.userId,
        userName: "System",
        action: "deleted",
        resourceType: "contact",
        resourceId: contactId,
        resourceName: contact.email,
      });
    }

    revalidatePath("/dashboard/contacts");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
