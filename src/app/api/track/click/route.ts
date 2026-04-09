import { NextRequest, NextResponse } from "next/server";
import { verifyTrackingToken } from "@/lib/tracking";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const token = request.nextUrl.searchParams.get("t");

  if (!url || !token) {
    return NextResponse.json({ error: "Missing URL or token" }, { status: 400 });
  }

  // Validate URL is a proper HTTP(S) URL
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const data = verifyTrackingToken(token);
  if (!data) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

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
      .then(() => updateAnalyticsForRecipient(data.campaignId))
      .catch(() => {});
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
