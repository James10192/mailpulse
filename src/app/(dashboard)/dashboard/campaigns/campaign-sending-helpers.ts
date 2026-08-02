import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { checkEmailLimit, type PlanTier } from "@/lib/plans";
import { trackServerEvent } from "@/lib/analytics";
import { sendCampaignEmail } from "@/lib/resend";
import { sendWhatsApp, sendWhatsAppImage } from "@/lib/whatsapp";
import { htmlToPlainText } from "@/lib/message-content";
import { personalizeHtml } from "@/lib/email-utils";
import { canReceiveChannel } from "@/lib/mailpulse/consent";
import {
  generateTrackingToken,
  injectTrackingPixel,
  wrapLinksForTracking,
  generateUnsubscribeUrl,
} from "@/lib/tracking";
export type CampaignChannel = "EMAIL" | "WHATSAPP" | "SMS";

export class CampaignAlreadyClaimedError extends Error {
  constructor() {
    super("La campagne n'est plus disponible pour l'envoi.");
    this.name = "CampaignAlreadyClaimedError";
  }
}
type ContactRow = {
  id: string;
  email: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  subscribed: boolean;
  metadata: unknown;
};
function parseCampaignAudience(audience: string):
  | { kind: "all" }
  | { kind: "list"; id: string }
  | { kind: "tag"; name: string }
  | { error: string } {
  if (audience === "all") return { kind: "all" };
  if (audience.startsWith("list:")) {
    const id = audience.slice("list:".length);
    return id ? { kind: "list", id } : { error: "Segment invalide." };
  }
  if (audience.startsWith("tag:")) {
    const name = audience.slice("tag:".length).trim();
    return name && name.length <= 100 ? { kind: "tag", name } : { error: "Tag invalide." };
  }
  return { error: "Audience invalide." };
}

export async function validateCampaignForSending(campaignId: string, orgId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, organizationId: orgId },
  });
  if (!campaign) return { error: "Campagne introuvable." } as const;
  if (campaign.status !== "DRAFT") return { error: "Seules les campagnes en brouillon peuvent être envoyées." } as const;
  if (campaign.channel === "EMAIL" && !campaign.subject) return { error: "Le sujet de la campagne est requis." } as const;
  if (!campaign.htmlContent) return { error: "Le contenu de la campagne est requis." } as const;
  return { campaign } as const;
}

export async function fetchSenderAndContacts(senderId: string, audience: string, orgId: string, channel: CampaignChannel) {
  const sender = channel === "EMAIL"
    ? await prisma.emailSender.findFirst({ where: { id: senderId, organizationId: orgId } })
    : null;
  if (channel === "EMAIL" && !sender) return { error: "Expéditeur introuvable. Créez un expéditeur d'abord." } as const;

  const parsedAudience = parseCampaignAudience(audience);
  if ("error" in parsedAudience) return parsedAudience;

  let contacts: ContactRow[];
  const channelWhere = channel === "EMAIL" ? {} : { phone: { not: null } };
  const contactSelect = { id: true, email: true, phone: true, firstName: true, lastName: true, subscribed: true, metadata: true };
  if (parsedAudience.kind === "all") {
    contacts = await prisma.contact.findMany({
      where: { organizationId: orgId, subscribed: true, ...channelWhere },
      select: contactSelect,
    });
  } else if (parsedAudience.kind === "tag") {
    contacts = await prisma.contact.findMany({
      where: {
        organizationId: orgId,
        subscribed: true,
        ...channelWhere,
        tags: { some: { name: parsedAudience.name } },
      },
      select: contactSelect,
    });
  } else {
    const contactList = await prisma.contactList.findFirst({
      where: { id: parsedAudience.id, organizationId: orgId },
      select: { id: true },
    });
    if (!contactList) return { error: "Segment introuvable." } as const;
    contacts = await prisma.contact.findMany({
      where: {
        organizationId: orgId,
        subscribed: true,
        ...channelWhere,
        listMemberships: { some: { contactListId: contactList.id } },
      },
      select: contactSelect,
    });
  }

  contacts = contacts.filter((contact) => canReceiveChannel(contact, channel));

  if (contacts.length === 0) {
    return {
      error: channel === "WHATSAPP" || channel === "SMS"
        ? channel === "SMS"
          ? "Aucun contact actif avec un numéro mobile trouvé. Ajoutez un numéro avec son indicatif."
          : "Aucun contact actif avec un numéro WhatsApp trouvé. Ajoutez un numéro avec son indicatif."
        : "Aucun abonné actif trouvé. Ajoutez des contacts d'abord.",
    } as const;
  }
  return { sender, contacts } as const;
}

export async function checkSendingQuota(orgId: string, plan: PlanTier, recipientCount: number) {
  const emailCheck = await checkEmailLimit(orgId, plan);
  if (!emailCheck.allowed) {
    return { error: `Limite d'emails atteinte (${emailCheck.sent}/${emailCheck.limit}). Passez au plan Pro.` };
  }
  if (emailCheck.limit !== -1 && emailCheck.sent + recipientCount > emailCheck.limit) {
    return { error: `Vous ne pouvez envoyer que ${emailCheck.limit - emailCheck.sent} emails supplémentaires ce mois-ci (${recipientCount} contacts sélectionnés).` };
  }
  return null;
}

export async function initializeCampaignSending(
  campaignId: string,
  contacts: ContactRow[],
  sender: { name: string; email: string; replyTo: string | null },
  channel: CampaignChannel,
) {
  return prisma.$transaction(async (tx) => {
    // The conditional update is the campaign claim: provider calls only happen after it succeeds.
    const claim = await tx.campaign.updateMany({
      where: { id: campaignId, status: "DRAFT" },
      data: {
        status: "SENDING",
        sentAt: channel === "SMS" ? null : new Date(),
        completedAt: null,
        fromName: sender.name,
        fromEmail: sender.email,
        replyTo: sender.replyTo,
      },
    });
    if (claim.count !== 1) throw new CampaignAlreadyClaimedError();

    await tx.campaignAnalytics.upsert({
      where: { campaignId },
      update: { totalQueued: contacts.length, totalSent: 0, totalDelivered: 0, totalBounced: 0 },
      create: { campaignId, totalQueued: contacts.length, totalSent: 0 },
    });
    await tx.campaignRecipient.createMany({
      data: contacts.map((contact) => ({ campaignId, contactId: contact.id })),
      skipDuplicates: true,
    });

    const recipients = await tx.campaignRecipient.findMany({
      where: { campaignId, contactId: { in: contacts.map((contact) => contact.id) } },
      select: { id: true, contactId: true },
    });
    return new Map(recipients.map((recipient) => [recipient.contactId, recipient.id]));
  });
}

export async function sendEmailsToRecipients(
  campaign: { id: string; organizationId: string; subject: string; htmlContent: string },
  contacts: ContactRow[],
  sender: { name: string; email: string; replyTo: string | null },
  recipientMap: Map<string, string>,
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://mailpulse-two.vercel.app";
  const fromAddress = `${sender.name} <${sender.email}>`;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const BATCH_SIZE = 100;
  let sentCount = 0;

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);

    for (const contact of batch) {
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
          replyTo: sender.replyTo || undefined,
          campaignId: campaign.id,
          recipientId,
          unsubscribeUrl,
        });
        await prisma.communicationMessage.upsert({
          where: { organizationId_idempotencyKey: { organizationId: campaign.organizationId, idempotencyKey: `campaign:${campaign.id}:${recipientId}` } },
          create: {
            organizationId: campaign.organizationId,
            origin: "CAMPAIGN",
            contactId: contact.id,
            channel: "EMAIL",
            direction: "OUTBOUND",
            recipientType: "EMAIL",
            recipientValue: contact.email,
            contentType: "TEXT",
            text: htmlToPlainText(html),
            providerMessageId: null,
            status: "SENT",
            sentAt: new Date(),
            metadata: { campaignId: campaign.id, recipientId },
            idempotencyKey: `campaign:${campaign.id}:${recipientId}`,
          },
          update: {},
        });
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { sentAt: new Date() },
        });
        sentCount++;
      } catch (error) {
        await prisma.communicationMessage.upsert({
          where: { organizationId_idempotencyKey: { organizationId: campaign.organizationId, idempotencyKey: `campaign:${campaign.id}:${recipientId}` } },
          create: {
            organizationId: campaign.organizationId,
            origin: "CAMPAIGN",
            contactId: contact.id,
            channel: "EMAIL",
            direction: "OUTBOUND",
            recipientType: "EMAIL",
            recipientValue: contact.email,
            contentType: "TEXT",
            text: htmlToPlainText(html),
            status: "FAILED",
            failedAt: new Date(),
            errorCode: "campaign_send_failed",
            errorMessage: error instanceof Error ? error.message : "Échec de l’envoi de campagne.",
            metadata: { campaignId: campaign.id, recipientId },
            idempotencyKey: `campaign:${campaign.id}:${recipientId}`,
          },
          update: {},
        });
        await prisma.emailEvent.create({
          data: { type: "BOUNCED_SOFT", contactId: contact.id, recipientId, metadata: { error: "send_failed" } },
        });
      }
    }

    if (i + BATCH_SIZE < contacts.length) {
      await delay(1000);
    }
  }

  return sentCount;
}

function personalizeText(text: string, contact: ContactRow) {
  return text
    .replace(/\{\{firstName\}\}/g, contact.firstName || "")
    .replace(/\{\{lastName\}\}/g, contact.lastName || "")
    .replace(/\{\{email\}\}/g, contact.email || "")
    .replace(/\{\{phone\}\}/g, contact.phone || "");
}

async function getOrgWhatsApp(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      whatsappEnabled: true,
      whatsappMode: true,
      whatsappPhone: true,
      evoInstanceName: true,
      evoInstanceStatus: true,
      metaWabaId: true,
      metaPhoneNumberId: true,
      metaAccessToken: true,
    },
  });
}

export async function sendWhatsAppToRecipients(
  campaign: { id: string; htmlContent: string; whatsappImageUrl: string | null; whatsappImageName: string | null },
  contacts: ContactRow[],
  recipientMap: Map<string, string>,
  orgId: string,
) {
  const orgWa = await getOrgWhatsApp(orgId);
  if (!orgWa?.whatsappEnabled) {
    throw new Error("WhatsApp non active. Connectez WhatsApp dans Messagerie avant l'envoi.");
  }
  if (orgWa.whatsappMode === "META") {
    throw new Error("Les campagnes WhatsApp Meta exigent un modèle approuvé. Utilisez l'API messages avec un contenu template.");
  }

  const text = htmlToPlainText(campaign.htmlContent);
  if (!text) throw new Error("Le message WhatsApp est vide.");

  let sentCount = 0;
  for (const contact of contacts) {
    const recipientId = recipientMap.get(contact.id);
    if (!recipientId || !contact.phone) continue;

    try {
      const messageText = personalizeText(text, contact);
      const sent = campaign.whatsappImageUrl
        ? await sendWhatsAppImage(orgWa, contact.phone, campaign.whatsappImageUrl, messageText)
        : await sendWhatsApp(orgWa, contact.phone, messageText);
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: { sentAt: new Date() },
      });
      await prisma.communicationMessage.upsert({
        where: { organizationId_idempotencyKey: { organizationId: orgId, idempotencyKey: `campaign:${campaign.id}:${recipientId}` } },
        create: {
          organizationId: orgId,
          origin: "CAMPAIGN",
          contactId: contact.id,
          channel: "WHATSAPP",
          direction: "OUTBOUND",
          recipientType: "PHONE",
          recipientValue: contact.phone,
          contentType: "TEXT",
          text: messageText,
          providerMessageId: sent.messageId ?? null,
          status: "SENT",
          sentAt: new Date(),
          metadata: {
            campaignId: campaign.id,
            recipientId,
            ...(campaign.whatsappImageUrl
              ? { whatsappImageUrl: campaign.whatsappImageUrl, whatsappImageName: campaign.whatsappImageName }
              : {}),
          },
          idempotencyKey: `campaign:${campaign.id}:${recipientId}`,
        },
        update: {},
      });
      sentCount++;
    } catch {
      await prisma.emailEvent.create({
        data: { type: "BOUNCED_SOFT", contactId: contact.id, recipientId, metadata: { error: "whatsapp_send_failed" } },
      });
    }
  }

  return sentCount;
}

export async function queueSmsForRecipients(
  campaign: { id: string; htmlContent: string },
  contacts: ContactRow[],
  orgId: string,
) {
  const text = htmlToPlainText(campaign.htmlContent);
  if (!text) throw new Error("Le message SMS est vide.");

  return prisma.$transaction(async (tx) => {
    const claim = await tx.campaign.updateMany({
      where: { id: campaign.id, organizationId: orgId, status: "DRAFT" },
      data: { status: "SENDING", sentAt: null, completedAt: null, fromName: "SMS", fromEmail: null, replyTo: null },
    });
    if (claim.count !== 1) throw new Error("La campagne n'est plus disponible pour l'envoi.");

    await tx.campaignRecipient.createMany({
      data: contacts.map((contact) => ({ campaignId: campaign.id, contactId: contact.id })),
      skipDuplicates: true,
    });

    const recipients = await tx.campaignRecipient.findMany({
      where: { campaignId: campaign.id },
      select: { id: true, contactId: true },
    });
    const recipientIds = new Map(recipients.map((recipient) => [recipient.contactId, recipient.id]));
    const messages = contacts.flatMap((contact) => {
      const recipientId = recipientIds.get(contact.id);
      if (!recipientId || !contact.phone) return [];
      return [{
        organizationId: orgId,
        origin: "CAMPAIGN" as const,
        contactId: contact.id,
        channel: "SMS" as const,
        direction: "OUTBOUND" as const,
        recipientType: "PHONE" as const,
        recipientValue: contact.phone,
        contentType: "TEXT" as const,
        text: personalizeText(text, contact),
        metadata: { campaignId: campaign.id, recipientId },
        idempotencyKey: `campaign:${campaign.id}:${recipientId}`,
        status: "QUEUED" as const,
      }];
    });
    if (messages.length === 0) throw new Error("Aucun destinataire SMS valide.");

    await tx.campaignAnalytics.upsert({
      where: { campaignId: campaign.id },
      update: { totalQueued: messages.length, totalSent: 0, totalDelivered: 0, totalBounced: 0 },
      create: { campaignId: campaign.id, totalQueued: messages.length, totalSent: 0 },
    });
    await tx.communicationMessage.createMany({ data: messages, skipDuplicates: true });
    return messages.length;
  });
}

export async function completeCampaignSending(
  campaignId: string,
  orgId: string,
  sentCount: number,
  user: { id: string; name: string | null; email: string },
  campaignName: string,
  channel: CampaignChannel,
) {
  if (channel === "SMS") {
    trackServerEvent(user.id, "campaign_queued", {
      campaign_id: campaignId,
      campaign_name: campaignName,
      recipients: sentCount,
    }, orgId);

    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: orgId,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "created",
      resourceType: "campaign",
      resourceId: campaignId,
      resourceName: `${campaignName} (${sentCount} SMS mis en file)`,
    });
    revalidatePath("/dashboard/campaigns");
    revalidatePath("/dashboard");
    return;
  }

  const updates: Promise<unknown>[] = [
    prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", completedAt: new Date() },
    }),
    prisma.campaignAnalytics.update({
      where: { campaignId },
      data: { totalSent: sentCount },
    }),
  ];
  if (channel === "EMAIL") {
    updates.push(prisma.organization.update({
      where: { id: orgId },
      data: { emailsSentThisMonth: { increment: sentCount } },
    }));
  }
  await Promise.all(updates);

  trackServerEvent(user.id, "campaign_sent", {
    campaign_id: campaignId,
    campaign_name: campaignName,
    recipients: sentCount,
  }, orgId);

  convexServer.mutation(api.dashboard.logActivity, {
    organizationId: orgId,
    userId: user.id,
    userName: user.name ?? user.email,
    action: "created",
    resourceType: "campaign",
    resourceId: campaignId,
    resourceName: `${campaignName} (envoyé à ${sentCount} contacts)`,
  });

  revalidatePath("/dashboard/campaigns");
  revalidatePath("/dashboard");
}
