"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
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
  if (!result.success) return { error: "Donnees invalides." };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

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
    if ((e as Record<string, unknown>).code === "P2002")
      return { error: "Cet expediteur existe deja." };
    return { error: "Erreur lors de la creation." };
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
  if (!result.success) return { error: "Donnees invalides." };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

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
    if ((e as Record<string, unknown>).code === "P2002")
      return { error: "Cet expediteur existe deja." };
    return { error: "Erreur lors de la mise a jour." };
  }
}

export async function setDefaultSender(id: string): Promise<ActionState> {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Non authentifie." };

  const sender = await prisma.emailSender.findUnique({
    where: { id, organizationId: org.id },
    select: { id: true },
  });

  if (!sender) return { error: "Expediteur introuvable." };

  await prisma.$transaction([
    prisma.emailSender.updateMany({
      where: { organizationId: org.id },
      data: { isDefault: false },
    }),
    prisma.emailSender.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/dashboard/senders");
  revalidatePath("/dashboard/platform");
  return { success: true };
}

export async function deleteSender(id: string): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    const sender = await prisma.emailSender.findUnique({
      where: { id, organizationId: org.id },
      select: { isDefault: true },
    });

    if (!sender) return { error: "Expediteur introuvable." };

    await prisma.emailSender.delete({ where: { id, organizationId: org.id } });

    if (sender.isDefault) {
      const nextSender = await prisma.emailSender.findFirst({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (nextSender) {
        await prisma.emailSender.update({
          where: { id: nextSender.id },
          data: { isDefault: true },
        });
      }
    }

    trackServerEvent(user.id, EVENTS.SENDER_DELETED, { sender_id: id }, org.id);
    revalidatePath("/dashboard/senders");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
