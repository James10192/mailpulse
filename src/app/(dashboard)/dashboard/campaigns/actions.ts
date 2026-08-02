"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../../../convex/_generated/api";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, checkCampaignLimit, getFeatureUpgradeMessage, type PlanTier } from "@/lib/plans";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";

const campaignCreateSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  channel: z.enum(["EMAIL", "WHATSAPP", "SMS"]).default("EMAIL"),
  content: z.string().max(918, "Un SMS est limité à 918 caractères.").optional(),
});

export async function createCampaign(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = campaignCreateSchema.safeParse({
    name: formData.get("name"),
    channel: formData.get("channel") || "EMAIL",
    content: formData.get("content") || undefined,
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
    if (result.data.channel === "WHATSAPP" && !canAccessFeature(org.plan as PlanTier, "whatsapp")) {
      return { error: getFeatureUpgradeMessage("whatsapp") };
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
        htmlContent: result.data.channel === "SMS" ? result.data.content?.trim() || null : null,
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
  if (campaign.channel === "SMS") return { error: "La planification SMS n’est pas encore disponible. Envoyez la campagne maintenant." };
  if (campaign.channel === "WHATSAPP" && !canAccessFeature(org.plan as PlanTier, "whatsapp")) {
    return { error: getFeatureUpgradeMessage("whatsapp") };
  }
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
    channel?: "EMAIL" | "WHATSAPP" | "SMS";
    whatsappImageUrl?: string | null;
    whatsappImageName?: string | null;
  },
  options?: { revalidate?: boolean }
): Promise<ActionState> {
  try {
    const { user, org } = await getCurrentUserAndOrg();
    if (!user || !org) return { error: "Non authentifie." };
    if (data.channel === "WHATSAPP" && !canAccessFeature(org.plan as PlanTier, "whatsapp")) {
      return { error: getFeatureUpgradeMessage("whatsapp") };
    }

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
