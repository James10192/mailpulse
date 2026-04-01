import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCampaignEmail } from "@/lib/resend";
import { personalizeHtml } from "@/lib/email-utils";
import {
  generateTrackingToken,
  injectTrackingPixel,
  wrapLinksForTracking,
  generateUnsubscribeUrl,
} from "@/lib/tracking";

export async function GET(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const now = new Date();

  // Find scheduled campaigns that are due
  const campaigns = await prisma.campaign.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
    include: {
      organization: { select: { id: true, plan: true } },
    },
  });

  if (campaigns.length === 0) {
    return Response.json({ message: "No scheduled campaigns", sent: 0 });
  }

  let totalSent = 0;

  for (const campaign of campaigns) {
    if (!campaign.subject || !campaign.htmlContent || !campaign.fromEmail || !campaign.fromName) {
      // Skip incomplete campaigns
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "DRAFT" },
      });
      continue;
    }

    // Update status to SENDING
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "SENDING", sentAt: now },
    });

    // Get contacts
    let contacts: { id: string; email: string; firstName: string | null; lastName: string | null }[];
    if (campaign.contactListId) {
      const members = await prisma.contactListMember.findMany({
        where: { contactListId: campaign.contactListId },
        select: {
          contact: { select: { id: true, email: true, firstName: true, lastName: true, subscribed: true } },
        },
      });
      contacts = members.filter((m) => m.contact.subscribed).map((m) => m.contact);
    } else {
      contacts = await prisma.contact.findMany({
        where: { organizationId: campaign.organizationId, subscribed: true },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
    }

    if (contacts.length === 0) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "SENT", completedAt: now },
      });
      continue;
    }

    // Create analytics + recipients
    await prisma.campaignAnalytics.upsert({
      where: { campaignId: campaign.id },
      update: { totalSent: contacts.length },
      create: { campaignId: campaign.id, totalSent: contacts.length },
    });

    await prisma.campaignRecipient.createMany({
      data: contacts.map((c) => ({ campaignId: campaign.id, contactId: c.id })),
      skipDuplicates: true,
    });

    const recipients = await prisma.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
      select: { id: true, contactId: true },
    });
    const recipientMap = new Map(recipients.map((r) => [r.contactId, r.id]));

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mailpulse-two.vercel.app";
    const fromAddress = `${campaign.fromName} <${campaign.fromEmail}>`;
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    let sentCount = 0;
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const recipientId = recipientMap.get(contact.id);
      if (!recipientId) continue;

      const token = generateTrackingToken(recipientId, campaign.id);
      const unsubscribeUrl = generateUnsubscribeUrl(baseUrl, contact.id, campaign.id);

      let html = personalizeHtml(campaign.htmlContent, contact);
      html = wrapLinksForTracking(html, `${baseUrl}/api/track/click`, token);
      html = injectTrackingPixel(html, `${baseUrl}/api/track/open?t=${token}`);

      try {
        await sendCampaignEmail({
          to: contact.email,
          from: fromAddress,
          subject: campaign.subject,
          html,
          replyTo: campaign.replyTo || undefined,
          campaignId: campaign.id,
          recipientId,
          unsubscribeUrl,
        });

        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { sentAt: now },
        });
        sentCount++;
      } catch {
        // Continue sending to other recipients
      }

      // Rate limit: 200ms between sends
      if (i < contacts.length - 1) await delay(200);
    }

    // Mark as SENT
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "SENT", completedAt: new Date() },
    });

    await prisma.campaignAnalytics.update({
      where: { campaignId: campaign.id },
      data: { totalSent: sentCount },
    });

    await prisma.organization.update({
      where: { id: campaign.organizationId },
      data: { emailsSentThisMonth: { increment: sentCount } },
    });

    totalSent += sentCount;
  }

  return Response.json({ message: `Sent ${campaigns.length} campaign(s)`, totalSent });
}
