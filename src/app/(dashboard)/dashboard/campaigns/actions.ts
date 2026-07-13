"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkCampaignLimit, checkEmailLimit, type PlanTier } from "@/lib/plans";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
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

const campaignCreateSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  channel: z.enum(["EMAIL", "WHATSAPP"]).default("EMAIL"),
});

export async function createCampaign(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = campaignCreateSchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel") || "EMAIL",
  });
  if (!result.success) {
    return { error: "Le nom de la campagne est requis." };
  }

  let campaignId: string;

  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) {
      return { error: "Utilisateur non trouve." };
    }

    const campaignCheck = await checkCampaignLimit(org.id, org.plan as PlanTier);
    if (!campaignCheck.allowed) {
      return { error: `Limite de campagnes actives atteinte (${campaignCheck.limit}). Passez au plan Pro.` };
    }

    const campaign = await prisma.campaign.create({
      data: {
        name: result.data.name,
        status: "DRAFT",
        channel: result.data.channel,
        type: "REGULAR",
        userId: user.id,
        organizationId: org.id,
      },
    });

    campaignId = campaign.id;

    trackServerEvent(user.id, EVENTS.CAMPAIGN_CREATED, {
      campaign_name: result.data.name,
    }, org.id);

    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "created",
      resourceType: "campaign",
      resourceId: campaign.id,
      resourceName: result.data.name,
    });

    revalidatePath("/dashboard/campaigns");
    revalidatePath("/dashboard");
  } catch {
    return { error: "Erreur lors de la création de la campagne." };
  }

  redirect(`/dashboard/campaigns/${campaignId}/edit`);
}

export async function deleteCampaign(campaignId: string): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) return { error: "Non authentifie." };

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId: org.id },
      select: { name: true, organizationId: true, userId: true },
    });
    if (!campaign) return { error: "Campagne introuvable." };
    await prisma.campaign.delete({ where: { id: campaignId } });

    if (campaign) {
      trackServerEvent(campaign.userId, EVENTS.CAMPAIGN_DELETED, { campaign_name: campaign.name }, campaign.organizationId);
      convexServer.mutation(api.dashboard.logActivity, {
        organizationId: campaign.organizationId,
        userId: campaign.userId,
        userName: "System",
        action: "deleted",
        resourceType: "campaign",
        resourceId: campaignId,
        resourceName: campaign.name,
      });
    }

    revalidatePath("/dashboard/campaigns");
    revalidatePath("/dashboard");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}

export async function scheduleCampaign(
  campaignId: string,
  senderId: string,
  audience: "all" | string,
  scheduledAt: string
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, organizationId: org.id },
  });
  if (!campaign) return { error: "Campagne introuvable." };
  if (campaign.status !== "DRAFT") return { error: "Seules les campagnes en brouillon peuvent être planifiées." };

  const sender = campaign.channel === "EMAIL"
    ? await prisma.emailSender.findUnique({ where: { id: senderId } })
    : null;
  if (campaign.channel === "EMAIL" && !sender) return { error: "Expéditeur introuvable." };

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return { error: "La date doit être dans le futur." };
  }

  try {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "SCHEDULED",
        scheduledAt: scheduledDate,
        fromName: sender?.name ?? null,
        fromEmail: sender?.email ?? null,
        replyTo: sender?.replyTo ?? null,
        contactListId: audience === "all" ? null : audience,
      },
    });

    trackServerEvent(user.id, "campaign_scheduled", {
      campaign_id: campaignId,
      campaign_name: campaign.name,
      scheduled_at: scheduledAt,
    }, org.id);

    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "created",
      resourceType: "campaign",
      resourceId: campaignId,
      resourceName: `${campaign.name} (planifiée)`,
    });

    revalidatePath("/dashboard/campaigns");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la planification." };
  }
}

export async function updateCampaign(
  campaignId: string,
  data: {
    name?: string;
    subject?: string;
    previewText?: string;
    htmlContent?: string;
    channel?: "EMAIL" | "WHATSAPP";
    whatsappImageUrl?: string | null;
    whatsappImageName?: string | null;
  },
  options?: { revalidate?: boolean }
): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) return { error: "Non authentifie." };

    const updateData: Record<string, string | null> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.subject !== undefined) updateData.subject = data.subject || null;
    if (data.previewText !== undefined) updateData.previewText = data.previewText || null;
    if (data.htmlContent !== undefined) updateData.htmlContent = data.htmlContent || null;
    if (data.channel !== undefined) updateData.channel = data.channel;
    if (data.whatsappImageUrl !== undefined) updateData.whatsappImageUrl = data.whatsappImageUrl || null;
    if (data.whatsappImageName !== undefined) updateData.whatsappImageName = data.whatsappImageName || null;

    // updateOrThrow ensures campaign exists and belongs to org; only DRAFT campaigns can be edited
    await prisma.campaign.update({
      where: { id: campaignId, organizationId: org.id, status: "DRAFT" },
      data: updateData,
    });

    if (options?.revalidate) {
      revalidatePath("/dashboard/campaigns");
    }
    return { success: true };
  } catch {
    return { error: "Erreur lors de la mise à jour." };
  }
}

export async function cancelCampaign(campaignId: string): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) return { error: "Non authentifie." };

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId, organizationId: org.id },
      select: { status: true, name: true },
    });
    if (!campaign) return { error: "Campagne introuvable." };
    if (!["SCHEDULED", "SENDING"].includes(campaign.status)) {
      return { error: "Seules les campagnes planifiées ou en cours peuvent être annulées." };
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "DRAFT", scheduledAt: null },
    });

    trackServerEvent(user.id, "campaign_cancelled", {
      campaign_id: campaignId,
      campaign_name: campaign.name,
    }, org.id);

    convexServer.mutation(api.dashboard.logActivity, {
      organizationId: org.id,
      userId: user.id,
      userName: user.name ?? user.email,
      action: "deleted",
      resourceType: "campaign",
      resourceId: campaignId,
      resourceName: `${campaign.name} (annulee)`,
    });

    revalidatePath("/dashboard/campaigns");
    return { success: true };
  } catch {
    return { error: "Erreur lors de l'annulation." };
  }
}

export async function getCampaignContent(campaignId: string): Promise<string | null> {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return null;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, organizationId: org.id },
    select: { htmlContent: true },
  });
  return campaign?.htmlContent ?? null;
}



type CampaignChannel = "EMAIL" | "WHATSAPP";
type ContactRow = { id: string; email: string; phone: string | null; firstName: string | null; lastName: string | null };

async function validateCampaignForSending(campaignId: string, orgId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, organizationId: orgId },
  });
  if (!campaign) return { error: "Campagne introuvable." } as const;
  if (campaign.status !== "DRAFT") return { error: "Seules les campagnes en brouillon peuvent être envoyées." } as const;
  if (campaign.channel === "EMAIL" && !campaign.subject) return { error: "Le sujet de la campagne est requis." } as const;
  if (!campaign.htmlContent) return { error: "Le contenu de la campagne est requis." } as const;
  return { campaign } as const;
}

async function fetchSenderAndContacts(senderId: string, audience: "all" | string, orgId: string, channel: CampaignChannel) {
  const sender = channel === "EMAIL" ? await prisma.emailSender.findUnique({ where: { id: senderId } }) : null;
  if (channel === "EMAIL" && !sender) return { error: "Expéditeur introuvable. Créez un expéditeur d'abord." } as const;

  let contacts: ContactRow[];
  const channelWhere = channel === "WHATSAPP" ? { phone: { not: null } } : {};
  const contactSelect = { id: true, email: true, phone: true, firstName: true, lastName: true };
  if (audience === "all") {
    contacts = await prisma.contact.findMany({
      where: { organizationId: orgId, subscribed: true, ...channelWhere },
      select: contactSelect,
    });
  } else {
    const members = await prisma.contactListMember.findMany({
      where: { contactListId: audience },
      select: {
        contact: { select: { ...contactSelect, subscribed: true } },
      },
    });
    contacts = members
      .filter((m) => m.contact.subscribed && (channel !== "WHATSAPP" || !!m.contact.phone))
      .map((m) => m.contact);
  }

  if (contacts.length === 0) {
    return {
      error: channel === "WHATSAPP"
        ? "Aucun contact actif avec un numéro WhatsApp trouvé. Ajoutez un numéro avec son indicatif."
        : "Aucun abonné actif trouvé. Ajoutez des contacts d'abord.",
    } as const;
  }
  return { sender, contacts } as const;
}

async function checkSendingQuota(orgId: string, plan: PlanTier, recipientCount: number) {
  const emailCheck = await checkEmailLimit(orgId, plan);
  if (!emailCheck.allowed) {
    return { error: `Limite d'emails atteinte (${emailCheck.sent}/${emailCheck.limit}). Passez au plan Pro.` };
  }
  if (emailCheck.limit !== -1 && emailCheck.sent + recipientCount > emailCheck.limit) {
    return { error: `Vous ne pouvez envoyer que ${emailCheck.limit - emailCheck.sent} emails supplémentaires ce mois-ci (${recipientCount} contacts sélectionnés).` };
  }
  return null;
}

async function initializeCampaignSending(
  campaignId: string,
  contacts: ContactRow[],
  sender: { name: string; email: string; replyTo: string | null },
) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SENDING", sentAt: new Date(), fromName: sender.name, fromEmail: sender.email, replyTo: sender.replyTo },
  });

  await prisma.campaignAnalytics.upsert({
    where: { campaignId },
    update: { totalSent: contacts.length },
    create: { campaignId, totalSent: contacts.length },
  });

  await prisma.campaignRecipient.createMany({
    data: contacts.map((c) => ({ campaignId, contactId: c.id })),
    skipDuplicates: true,
  });

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId },
    select: { id: true, contactId: true },
  });
  return new Map(recipients.map((r) => [r.contactId, r.id]));
}

async function sendEmailsToRecipients(
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
            providerMessageId: null,
            status: "SENT",
            sentAt: new Date(),
            metadata: { campaignId: campaign.id, recipientId },
          },
        });
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { sentAt: new Date() },
        });
        sentCount++;
      } catch (error) {
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
            status: "FAILED",
            failedAt: new Date(),
            errorCode: "campaign_send_failed",
            errorMessage: error instanceof Error ? error.message : "Échec de l’envoi de campagne.",
            metadata: { campaignId: campaign.id, recipientId },
          },
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

async function sendWhatsAppToRecipients(
  campaign: { id: string; htmlContent: string; whatsappImageUrl: string | null; whatsappImageName: string | null },
  contacts: ContactRow[],
  recipientMap: Map<string, string>,
  orgId: string,
) {
  const orgWa = await getOrgWhatsApp(orgId);
  if (!orgWa?.whatsappEnabled) {
    throw new Error("WhatsApp non active. Connectez WhatsApp dans Messagerie avant l'envoi.");
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
      await prisma.communicationMessage.create({
        data: {
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
        },
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

async function completeCampaignSending(
  campaignId: string,
  orgId: string,
  sentCount: number,
  user: { id: string; name: string | null; email: string },
  campaignName: string,
) {
  await Promise.all([
    prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", completedAt: new Date() },
    }),
    prisma.campaignAnalytics.update({
      where: { campaignId },
      data: { totalSent: sentCount },
    }),
    prisma.organization.update({
      where: { id: orgId },
      data: { emailsSentThisMonth: { increment: sentCount } },
    }),
  ]);

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



export async function sendCampaign(
  campaignId: string,
  senderId: string,
  audience: "all" | string // "all" or contactListId
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const validation = await validateCampaignForSending(campaignId, org.id);
  if ("error" in validation) return { error: validation.error };
  const { campaign } = validation;

  const fetched = await fetchSenderAndContacts(senderId, audience, org.id, campaign.channel as CampaignChannel);
  if ("error" in fetched) return { error: fetched.error };
  const { sender, contacts } = fetched;

  if (campaign.channel === "EMAIL") {
    const quotaError = await checkSendingQuota(org.id, org.plan as PlanTier, contacts.length);
    if (quotaError) return quotaError;
  }

  try {
    const recipientMap = await initializeCampaignSending(campaignId, contacts, sender ?? { name: "WhatsApp", email: "", replyTo: null });

    const sentCount = campaign.channel === "WHATSAPP"
      ? await sendWhatsAppToRecipients(
          {
            id: campaignId,
            htmlContent: campaign.htmlContent!,
            whatsappImageUrl: campaign.whatsappImageUrl,
            whatsappImageName: campaign.whatsappImageName,
          },
          contacts,
          recipientMap,
          org.id,
        )
      : await sendEmailsToRecipients(
          { id: campaignId, organizationId: org.id, subject: campaign.subject!, htmlContent: campaign.htmlContent! },
          contacts,
          sender!,
          recipientMap,
        );

    await completeCampaignSending(campaignId, org.id, sentCount, user, campaign.name);
    return { success: true };
  } catch {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", completedAt: new Date() },
    });
    return { error: "Envoi partiellement terminé. Vérifiez les analytics." };
  }
}
