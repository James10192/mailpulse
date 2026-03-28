"use server";

import { prisma } from "@/lib/prisma";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email("Email invalide"),
  pageId: z.string().min(1),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export async function subscribeViaCapturePage(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const result = subscribeSchema.safeParse({
    email: formData.get("email"),
    pageId: formData.get("pageId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
  });

  if (!result.success) return { error: "Email invalide." };

  const { email, pageId, firstName, lastName } = result.data;

  try {
    // Resolve organizationId from pageId (never trust client-provided orgId)
    const page = await prisma.capturePage.findUnique({
      where: { id: pageId },
      select: { organizationId: true },
    });
    if (!page) return { error: "Page introuvable." };

    const organizationId = page.organizationId;

    // Resolve org owner for userId
    const member = await prisma.member.findFirst({
      where: { organizationId, role: "owner" },
      select: { userId: true },
    });
    const userId = member?.userId ?? (await prisma.user.findFirst({ where: {}, select: { id: true } }))?.id;
    if (!userId) return { error: "Configuration incomplete." };

    // Upsert contact (avoids race condition + reduces queries)
    const existing = await prisma.contact.findFirst({
      where: { email, organizationId },
    });

    if (existing) {
      if (!existing.subscribed) {
        await prisma.contact.update({
          where: { id: existing.id },
          data: { subscribed: true },
        });
      }
    } else {
      await prisma.contact.create({
        data: {
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          subscribed: true,
          organizationId,
          userId,
        },
      });
    }

    trackServerEvent("capture-form", EVENTS.CAPTURE_PAGE_SUBMISSION, {
      page_id: pageId,
      email_domain: email.split("@")[1],
    }, organizationId);

    return { success: true };
  } catch {
    return { error: "Erreur lors de l'inscription." };
  }
}
