import { NextRequest } from "next/server";
import { verifyTrackingToken } from "@/lib/tracking";
import { prisma } from "@/lib/prisma";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");

  if (token) {
    const data = verifyTrackingToken(token);
    if (data) {
      // Fetch contactId from recipient record
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: data.recipientId },
        select: { contactId: true },
      });

      if (recipient) {
        // Fire-and-forget: don't block pixel response
        prisma.emailEvent
          .create({
            data: {
              type: "OPENED",
              recipientId: data.recipientId,
              contactId: recipient.contactId,
              metadata: {
                ip: request.headers.get("x-forwarded-for") ?? "unknown",
                userAgent: request.headers.get("user-agent"),
                timestamp: new Date().toISOString(),
              },
            },
          })
          .catch((err: unknown) => console.error("[tracking] Failed to record event:", err));

        prisma.campaignRecipient
          .update({
            where: { id: data.recipientId },
            data: { openedAt: new Date() },
          })
          .then(() => {
            // Update campaign analytics after recording the open
            return updateAnalyticsForRecipient(data.campaignId);
          })
          .catch((err: unknown) => console.error("[tracking] Failed to record event:", err));
      }
    }
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

async function updateAnalyticsForRecipient(campaignId: string) {
  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: { deliveredAt: true, openedAt: true, clickedAt: true, bouncedAt: true, complainedAt: true, unsubscribedAt: true },
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
