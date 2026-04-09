import { NextRequest, NextResponse } from "next/server";
import { verifyTrackingToken } from "@/lib/tracking";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const token = request.nextUrl.searchParams.get("t");

  if (!url) {
    return new Response("Missing URL", { status: 400 });
  }

  if (token) {
    const data = verifyTrackingToken(token);
    if (data) {
      // Fetch contactId from recipient record
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: data.recipientId },
        select: { contactId: true },
      });

      if (recipient) {
        // Fire-and-forget: log click event
        prisma.emailEvent
          .create({
            data: {
              type: "CLICKED",
              recipientId: data.recipientId,
              contactId: recipient.contactId,
              metadata: {
                url,
                ip: request.headers.get("x-forwarded-for") ?? "unknown",
                userAgent: request.headers.get("user-agent"),
                timestamp: new Date().toISOString(),
              },
            },
          })
          .catch((err: unknown) => console.error("[tracking] Failed to record event:", err));

        // Update recipient click timestamp + analytics
        prisma.campaignRecipient
          .update({
            where: { id: data.recipientId },
            data: { clickedAt: new Date() },
          })
          .then(() => updateAnalyticsForRecipient(data.campaignId))
          .catch((err: unknown) => console.error("[tracking] Failed to record event:", err));
      }
    }
  }

  // 302 redirect to original URL
  return NextResponse.redirect(url, 302);
}

async function updateAnalyticsForRecipient(campaignId: string) {
  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: { deliveredAt: true, openedAt: true, clickedAt: true, bouncedAt: true },
  });
  const totalSent = recipients.length;
  const totalDelivered = recipients.filter((r) => r.deliveredAt).length;
  const totalOpened = recipients.filter((r) => r.openedAt).length;
  const totalClicked = recipients.filter((r) => r.clickedAt).length;
  const totalBounced = recipients.filter((r) => r.bouncedAt).length;

  await prisma.campaignAnalytics.upsert({
    where: { campaignId },
    create: { campaignId, totalSent, totalDelivered, totalOpened, uniqueOpens: totalOpened, totalClicked, uniqueClicks: totalClicked, totalBounced, openRate: totalDelivered > 0 ? totalOpened / totalDelivered : 0, clickRate: totalDelivered > 0 ? totalClicked / totalDelivered : 0, bounceRate: totalSent > 0 ? totalBounced / totalSent : 0 },
    update: { totalSent, totalDelivered, totalOpened, uniqueOpens: totalOpened, totalClicked, uniqueClicks: totalClicked, totalBounced, openRate: totalDelivered > 0 ? totalOpened / totalDelivered : 0, clickRate: totalDelivered > 0 ? totalClicked / totalDelivered : 0, bounceRate: totalSent > 0 ? totalBounced / totalSent : 0 },
  });
}
