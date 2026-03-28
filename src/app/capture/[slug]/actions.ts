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
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: { userId: true },
    });
    if (!member) return { error: "Configuration incomplete." };
    const userId = member.userId;

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Promise.all([
      prisma.capturePage.update({
        where: { id: pageId },
        data: { conversions: { increment: 1 } },
      }),
      prisma.capturePageDailyStat.upsert({
        where: { capturePageId_date: { capturePageId: pageId, date: today } },
        update: { conversions: { increment: 1 } },
        create: { capturePageId: pageId, date: today, conversions: 1 },
      }),
    ]);

    return { success: true };
  } catch {
    return { error: "Erreur lors de l'inscription." };
  }
}

export async function trackCapturePageView(pageId: string): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    await Promise.all([
      prisma.capturePage.update({
        where: { id: pageId },
        data: {
          totalViews: { increment: 1 },
          uniqueViews: { increment: 1 },
        },
      }),
      prisma.capturePageDailyStat.upsert({
        where: { capturePageId_date: { capturePageId: pageId, date: today } },
        update: { views: { increment: 1 }, uniqueViews: { increment: 1 } },
        create: { capturePageId: pageId, date: today, views: 1, uniqueViews: 1 },
      }),
    ]);
  } catch {
    // Fire and forget
  }
}
