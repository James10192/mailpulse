"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkCampaignLimit, checkEmailLimit, canAccessFeature, type PlanTier } from "@/lib/plans";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import { sendCampaignEmail } from "@/lib/resend";
import { personalizeHtml } from "@/lib/email-utils";
import {
  generateTrackingToken,
  injectTrackingPixel,
  wrapLinksForTracking,
  generateUnsubscribeUrl,
} from "@/lib/tracking";

const campaignCreateSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
});

export async function createCampaign(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = campaignCreateSchema.safeParse({
    name: formData.get("name"),
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
    return { error: "Erreur lors de la creation de la campagne." };
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
  if (campaign.status !== "DRAFT") return { error: "Seules les campagnes en brouillon peuvent etre planifiees." };

  const sender = await prisma.emailSender.findUnique({ where: { id: senderId } });
  if (!sender) return { error: "Expediteur introuvable." };

  const scheduledDate = new Date(scheduledAt);
  if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
    return { error: "La date doit etre dans le futur." };
  }

  try {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: "SCHEDULED",
        scheduledAt: scheduledDate,
        fromName: sender.name,
        fromEmail: sender.email,
        replyTo: sender.replyTo,
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
      resourceName: `${campaign.name} (planifiee)`,
    });

    revalidatePath("/dashboard/campaigns");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la planification." };
  }
}

export async function updateCampaign(
  campaignId: string,
  data: { name?: string; subject?: string; previewText?: string; htmlContent?: string },
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
    return { error: "Erreur lors de la mise a jour." };
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
      return { error: "Seules les campagnes planifiees ou en cours peuvent etre annulees." };
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

// ─── sendCampaign decomposed helpers ────────────────────

type ContactRow = { id: string; email: string; firstName: string | null; lastName: string | null };

async function validateCampaignForSending(campaignId: string, orgId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId, organizationId: orgId },
  });
  if (!campaign) return { error: "Campagne introuvable." } as const;
  if (campaign.status !== "DRAFT") return { error: "Seules les campagnes en brouillon peuvent etre envoyees." } as const;
  if (!campaign.subject) return { error: "Le sujet de la campagne est requis." } as const;
  if (!campaign.htmlContent) return { error: "Le contenu de la campagne est requis." } as const;
  return { campaign } as const;
}

async function fetchSenderAndContacts(senderId: string, audience: "all" | string, orgId: string) {
  const sender = await prisma.emailSender.findUnique({ where: { id: senderId } });
  if (!sender) return { error: "Expediteur introuvable. Creez un expediteur d'abord." } as const;

  let contacts: ContactRow[];
  if (audience === "all") {
    contacts = await prisma.contact.findMany({
      where: { organizationId: orgId, subscribed: true },
      select: { id: true, email: true, firstName: true, lastName: true },
    });
  } else {
    const members = await prisma.contactListMember.findMany({
      where: { contactListId: audience },
      select: {
        contact: { select: { id: true, email: true, firstName: true, lastName: true, subscribed: true } },
      },
    });
    contacts = members.filter((m) => m.contact.subscribed).map((m) => m.contact);
  }

  if (contacts.length === 0) return { error: "Aucun abonne actif trouve. Ajoutez des contacts d'abord." } as const;
  return { sender, contacts } as const;
}

async function checkSendingQuota(orgId: string, plan: PlanTier, recipientCount: number) {
  const emailCheck = await checkEmailLimit(orgId, plan);
  if (!emailCheck.allowed) {
    return { error: `Limite d'emails atteinte (${emailCheck.sent}/${emailCheck.limit}). Passez au plan Pro.` };
  }
  if (emailCheck.limit !== -1 && emailCheck.sent + recipientCount > emailCheck.limit) {
    return { error: `Vous ne pouvez envoyer que ${emailCheck.limit - emailCheck.sent} emails supplementaires ce mois-ci (${recipientCount} contacts selectionnes).` };
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
  campaign: { id: string; subject: string; htmlContent: string },
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
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: { sentAt: new Date() },
        });
        sentCount++;
      } catch {
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

async function completeCampaignSending(
  campaignId: string,
  orgId: string,
  sentCount: number,
  user: { id: string; name: string | null; email: string },
  campaignName: string,
) {
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "SENT", completedAt: new Date() },
  });
  await prisma.campaignAnalytics.update({
    where: { campaignId },
    data: { totalSent: sentCount },
  });
  await prisma.organization.update({
    where: { id: orgId },
    data: { emailsSentThisMonth: { increment: sentCount } },
  });

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
    resourceName: `${campaignName} (envoye a ${sentCount} contacts)`,
  });

  revalidatePath("/dashboard/campaigns");
  revalidatePath("/dashboard");
}

// ─── sendCampaign orchestrator ──────────────────────────

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

  const fetched = await fetchSenderAndContacts(senderId, audience, org.id);
  if ("error" in fetched) return { error: fetched.error };
  const { sender, contacts } = fetched;

  const quotaError = await checkSendingQuota(org.id, org.plan as PlanTier, contacts.length);
  if (quotaError) return quotaError;

  try {
    const recipientMap = await initializeCampaignSending(campaignId, contacts, sender);

    const sentCount = await sendEmailsToRecipients(
      { id: campaignId, subject: campaign.subject!, htmlContent: campaign.htmlContent! },
      contacts,
      sender,
      recipientMap,
    );

    await completeCampaignSending(campaignId, org.id, sentCount, user, campaign.name);
    return { success: true };
  } catch {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", completedAt: new Date() },
    });
    return { error: "Envoi partiellement termine. Verifiez les analytics." };
  }
}
