import { prisma } from "@/lib/prisma";

export async function recalculateCampaignAnalytics(campaignId: string): Promise<{
  bounceRate: number;
  unsubscribeRate: number;
  totalSent: number;
}> {
  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: {
      sentAt: true,
      deliveredAt: true,
      openedAt: true,
      clickedAt: true,
      bouncedAt: true,
      complainedAt: true,
      unsubscribedAt: true,
    },
  });

  type Recipient = (typeof recipients)[number];

  const totalSent = recipients.filter((r: Recipient) => r.sentAt).length;
  const totalDelivered = recipients.filter((r: Recipient) => r.deliveredAt).length;
  const totalOpened = recipients.filter((r: Recipient) => r.openedAt).length;
  const totalClicked = recipients.filter((r: Recipient) => r.clickedAt).length;
  const totalBounced = recipients.filter((r: Recipient) => r.bouncedAt).length;
  const totalComplaints = recipients.filter((r: Recipient) => r.complainedAt).length;
  const totalUnsubscribed = recipients.filter((r: Recipient) => r.unsubscribedAt).length;

  const openRate = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
  const clickRate = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;
  const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
  const unsubscribeRate = totalDelivered > 0 ? (totalUnsubscribed / totalDelivered) * 100 : 0;

  await prisma.campaignAnalytics.upsert({
    where: { campaignId },
    create: {
      campaignId,
      totalSent,
      totalDelivered,
      totalOpened,
      uniqueOpens: totalOpened,
      totalClicked,
      uniqueClicks: totalClicked,
      totalBounced,
      totalComplaints,
      totalUnsubscribed,
      openRate,
      clickRate,
      bounceRate,
    },
    update: {
      totalSent,
      totalDelivered,
      totalOpened,
      uniqueOpens: totalOpened,
      totalClicked,
      uniqueClicks: totalClicked,
      totalBounced,
      totalComplaints,
      totalUnsubscribed,
      openRate,
      clickRate,
      bounceRate,
    },
  });

  return { bounceRate, unsubscribeRate, totalSent };
}
