"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { isUniqueConstraintViolation } from "@/lib/prisma-errors";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";

const senderSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  replyTo: z.string().email("Email invalide").optional().or(z.literal("")),
});

export async function createSender(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = senderSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    replyTo: formData.get("replyTo"),
  });
  if (!result.success) return { error: "Données invalides." };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  try {
    const existingCount = await prisma.emailSender.count({
      where: { organizationId: org.id },
    });

    await prisma.emailSender.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        replyTo: result.data.replyTo || null,
        isDefault: existingCount === 0,
        organizationId: org.id,
      },
    });

    trackServerEvent(user.id, EVENTS.SENDER_CREATED, {
      sender_email: result.data.email,
    }, org.id);

    revalidatePath("/dashboard/senders");
    return { success: true };
  } catch (e) {
    if (isUniqueConstraintViolation(e))
      return { error: "Cet expéditeur existe déjà." };
    return { error: "Erreur lors de la création." };
  }
}

export async function updateSender(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = formData.get("id") as string;
  const result = senderSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    replyTo: formData.get("replyTo"),
  });
  if (!result.success) return { error: "Données invalides." };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  try {
    await prisma.emailSender.update({
      where: { id, organizationId: org.id },
      data: {
        name: result.data.name,
        email: result.data.email,
        replyTo: result.data.replyTo || null,
      },
    });

    revalidatePath("/dashboard/senders");
    return { success: true };
  } catch (e) {
    if (isUniqueConstraintViolation(e))
      return { error: "Cet expéditeur existe déjà." };
    return { error: "Erreur lors de la mise à jour." };
  }
}

export async function setDefaultSender(id: string): Promise<ActionState> {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Non authentifié." };

  const sender = await prisma.emailSender.findUnique({
    where: { id, organizationId: org.id },
    select: { id: true },
  });

  if (!sender) return { error: "Expéditeur introuvable." };

  await prisma.$transaction([
    prisma.emailSender.updateMany({
      where: { organizationId: org.id },
      data: { isDefault: false },
    }),
    prisma.emailSender.updateMany({
      where: { id, organizationId: org.id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/dashboard/senders");
  revalidatePath("/dashboard/platform");
  return { success: true };
}

export async function deleteSender(id: string): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  try {
    // Delete and promote the next default together, so the organization never
    // ends up without a default sender after a partial failure.
    const deleted = await prisma.$transaction(async (tx) => {
      const sender = await tx.emailSender.findFirst({
        where: { id, organizationId: org.id },
        select: { isDefault: true },
      });
      if (!sender) return false;

      await tx.emailSender.deleteMany({ where: { id, organizationId: org.id } });

      if (sender.isDefault) {
        const nextSender = await tx.emailSender.findFirst({
          where: { organizationId: org.id },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        });
        if (nextSender) {
          await tx.emailSender.updateMany({
            where: { id: nextSender.id, organizationId: org.id },
            data: { isDefault: true },
          });
        }
      }
      return true;
    });
    if (!deleted) return { error: "Expéditeur introuvable." };

    trackServerEvent(user.id, EVENTS.SENDER_DELETED, { sender_id: id }, org.id);
    revalidatePath("/dashboard/senders");
    return { success: true };
  } catch (error) {
    console.error("[senders] Failed to delete sender", { organizationId: org.id, senderId: id, error });
    return { error: "Erreur lors de la suppression." };
  }
}
