import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCampaignEmail } from "@/lib/resend";
import { sendWhatsApp, sendWhatsAppImage } from "@/lib/whatsapp";
import { htmlToPlainText } from "@/lib/message-content";
import { personalizeHtml } from "@/lib/email-utils";
import {
  generateTrackingToken,
  injectTrackingPixel,
  wrapLinksForTracking,
  generateUnsubscribeUrl,
} from "@/lib/tracking";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";
import { canReceiveChannel } from "@/lib/mailpulse/consent";

type ScheduledContact = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  subscribed: boolean;
  metadata: unknown;
};

function personalizeText(text: string, contact: ScheduledContact) {
  return text
    .replace(/\{\{firstName\}\}/g, contact.firstName || "")
    .replace(/\{\{lastName\}\}/g, contact.lastName || "")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{phone\}\}/g, contact.phone || "");
}

export async function GET(request: NextRequest) {
  // Scheduled dispatch must never be callable without a configured secret.
  const secret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
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
      organization: {
        select: {
          id: true,
          plan: true,
          whatsappEnabled: true,
          whatsappMode: true,
          whatsappPhone: true,
          evoInstanceName: true,
          evoInstanceStatus: true,
          metaWabaId: true,
          metaPhoneNumberId: true,
          metaAccessToken: true,
        },
      },
    },
  });

  if (campaigns.length === 0) {
    return Response.json({ message: "No scheduled campaigns", sent: 0 });
  }

  let totalSent = 0;

  for (const campaign of campaigns) {
    if (campaign.channel === "WHATSAPP" && !canAccessFeature(campaign.organization.plan as PlanTier, "whatsapp")) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: "DRAFT", scheduledAt: null },
      });
      continue;
    }
    const incompleteEmail = campaign.channel === "EMAIL" && (!campaign.subject || !campaign.htmlContent || !campaign.fromEmail || !campaign.fromName);
    const incompleteWhatsApp = campaign.channel === "WHATSAPP" && !htmlToPlainText(campaign.htmlContent);
    if (incompleteEmail || incompleteWhatsApp) {
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
    let contacts: ScheduledContact[];
    const contactSelect = { id: true, email: true, phone: true, firstName: true, lastName: true, subscribed: true, metadata: true };
    if (campaign.contactListId) {
      const members = await prisma.contactListMember.findMany({
        where: { contactListId: campaign.contactListId },
        select: {
          contact: { select: contactSelect },
        },
      });
      contacts = members
        .filter((m) => m.contact.subscribed && (campaign.channel !== "WHATSAPP" || !!m.contact.phone))
        .map((m) => m.contact);
    } else {
      contacts = await prisma.contact.findMany({
        where: {
          organizationId: campaign.organizationId,
          subscribed: true,
          ...(campaign.channel === "WHATSAPP" ? { phone: { not: null } } : {}),
        },
        select: contactSelect,
      });
    }
    contacts = contacts.filter((contact) => canReceiveChannel(contact, campaign.channel));

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
    const whatsappText = campaign.channel === "WHATSAPP" ? htmlToPlainText(campaign.htmlContent) : "";

    let sentCount = 0;
    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      const recipientId = recipientMap.get(contact.id);
      if (!recipientId) continue;

      try {
        if (campaign.channel === "WHATSAPP") {
          if (!contact.phone) continue;
          const text = personalizeText(whatsappText, contact);
          const sent = campaign.whatsappImageUrl
            ? await sendWhatsAppImage(campaign.organization, contact.phone, campaign.whatsappImageUrl, text)
            : await sendWhatsApp(campaign.organization, contact.phone, text);

          await prisma.communicationMessage.create({
            data: {
              organizationId: campaign.organizationId,
              origin: "CAMPAIGN",
              contactId: contact.id,
              channel: "WHATSAPP",
              direction: "OUTBOUND",
              recipientType: "PHONE",
              recipientValue: contact.phone,
              contentType: "TEXT",
              text,
              providerMessageId: sent.messageId ?? null,
              status: "SENT",
              sentAt: now,
              metadata: {
                campaignId: campaign.id,
                recipientId,
                ...(campaign.whatsappImageUrl
                  ? { whatsappImageUrl: campaign.whatsappImageUrl, whatsappImageName: campaign.whatsappImageName }
                  : {}),
              },
            },
          });
        } else {
          const token = generateTrackingToken(recipientId, campaign.id);
          const unsubscribeUrl = generateUnsubscribeUrl(baseUrl, contact.id, campaign.id);
          let html = personalizeHtml(campaign.htmlContent!, contact);
          html = wrapLinksForTracking(html, `${baseUrl}/api/track/click`, token);
          html = injectTrackingPixel(html, `${baseUrl}/api/track/open?t=${token}`);

          await sendCampaignEmail({
            to: contact.email,
            from: fromAddress,
            subject: campaign.subject!,
            html,
            replyTo: campaign.replyTo || undefined,
            campaignId: campaign.id,
            recipientId,
            unsubscribeUrl,
          });
          await prisma.communicationMessage.create({
            data: {
              organizationId: campaign.organizationId,
              origin: "CAMPAIGN",
              contactId: contact.id,
              channel: "EMAIL",
              direction: "OUTBOUND",
              recipientType: "EMAIL",
              recipientValue: contact.email,
              contentType: "TEXT",
              text: htmlToPlainText(html),
              status: "SENT",
              sentAt: now,
              metadata: { campaignId: campaign.id, recipientId },
            },
          });
        }

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
