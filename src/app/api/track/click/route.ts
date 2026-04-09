import { NextRequest, NextResponse } from "next/server";
import { verifyTrackingToken } from "@/lib/tracking";
import { prisma } from "@/lib/prisma";
import { recalculateCampaignAnalytics } from "@/lib/campaign-analytics";

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
          .catch(() => {});

        // Update recipient click timestamp + analytics
        prisma.campaignRecipient
          .update({
            where: { id: data.recipientId },
            data: { clickedAt: new Date() },
          })
          .then(() => recalculateCampaignAnalytics(data.campaignId))
          .catch(() => {});
      }
    }
  }

  // 302 redirect to original URL
  return NextResponse.redirect(url, 302);
}

