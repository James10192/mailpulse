"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, getFeatureUpgradeMessage, type PlanTier } from "@/lib/plans";
import { isOrangeSmsSenderAddress, orangeSmsSenderAddressFromEnvironment } from "@/lib/sms/orange-config";
import {
  CampaignAlreadyClaimedError,
  checkSendingQuota,
  completeCampaignSending,
  fetchSenderAndContacts,
  initializeCampaignSending,
  queueSmsForRecipients,
  sendEmailsToRecipients,
  sendWhatsAppToRecipients,
  type CampaignChannel,
  validateCampaignForSending,
} from "./campaign-sending-helpers";

const orangeSmsConfigurationSchema = z.object({
  enabled: z.enum(["true", "false"]),
  senderName: z.string().trim().min(1).max(11).regex(/^[A-Za-z0-9 ]+$/, "Le nom d'expéditeur accepte uniquement lettres, chiffres et espaces."),
});

function isSmsManager(memberRole: string | null, isAdmin: boolean) {
  return isAdmin || memberRole === "owner";
}

export async function updateOrangeSmsConfiguration(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = orangeSmsConfigurationSchema.safeParse({
    enabled: formData.get("enabled") === "on" ? "true" : "false",
    senderName: formData.get("senderName"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Configuration Orange CI invalide." };

  const { org, memberRole, isAdmin } = await getCurrentUserAndOrg();
  if (!org) return { error: "Non authentifié." };
  if (!isSmsManager(memberRole, isAdmin)) {
    return { error: "Seuls les administrateurs et le propriétaire peuvent configurer Orange CI." };
  }
  if (parsed.data.enabled === "true" && process.env.ORANGE_SMS_OWNER_ORGANIZATION_ID !== org.id) {
    return { error: "Cette organisation n'est pas autorisée à activer le compte Orange SMS." };
  }

  let senderAddress: string;
  try {
    senderAddress = orangeSmsSenderAddressFromEnvironment();
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Adresse Orange SMS invalide." };
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      smsEnabled: parsed.data.enabled === "true",
      smsProvider: "ORANGE_CI",
      smsSenderAddress: senderAddress,
      smsSenderName: parsed.data.senderName,
    },
  });
  revalidatePath("/dashboard/sms");
  return { success: true };
}

export async function sendCampaign(
  campaignId: string,
  senderId: string,
  audience: string,
): Promise<ActionState> {
  const { user, org, memberRole, isAdmin } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const validation = await validateCampaignForSending(campaignId, org.id);
  if ("error" in validation) return { error: validation.error };
  const { campaign } = validation;
  if (campaign.channel === "WHATSAPP" && !canAccessFeature(org.plan as PlanTier, "whatsapp")) {
    return { error: getFeatureUpgradeMessage("whatsapp") };
  }
  if (campaign.channel === "SMS") {
    if (!isSmsManager(memberRole, isAdmin)) {
      return { error: "Seuls les administrateurs et le propriétaire peuvent lancer une campagne SMS." };
    }
    const smsConfiguration = await prisma.organization.findUnique({
      where: { id: org.id },
      select: { smsEnabled: true, smsProvider: true, smsSenderAddress: true },
    });
    if (!smsConfiguration?.smsEnabled || !smsConfiguration.smsProvider || !isOrangeSmsSenderAddress(smsConfiguration.smsSenderAddress)) {
      return { error: "SMS non configuré. Un administrateur doit terminer la configuration Orange CI." };
    }
    try {
      if (smsConfiguration.smsSenderAddress !== orangeSmsSenderAddressFromEnvironment()) {
        return { error: "L'adresse Orange SMS enregistrée ne correspond pas à la configuration de déploiement." };
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Adresse Orange SMS invalide." };
    }
    if (process.env.ORANGE_SMS_OWNER_ORGANIZATION_ID !== org.id) {
      return { error: "Cette organisation n’est pas autorisée à utiliser le compte Orange SMS." };
    }
  }

  const fetched = await fetchSenderAndContacts(senderId, audience, org.id, campaign.channel as CampaignChannel);
  if ("error" in fetched) return { error: fetched.error };
  const { sender, contacts } = fetched;

  if (campaign.channel === "EMAIL") {
    const quotaError = await checkSendingQuota(org.id, org.plan as PlanTier, contacts.length);
    if (quotaError) return quotaError;
  }

  if (campaign.channel === "SMS") {
    let queuedCount: number;
    try {
      queuedCount = await queueSmsForRecipients(
        { id: campaignId, htmlContent: campaign.htmlContent! },
        contacts,
        org.id,
      );
    } catch {
      return { error: "La mise en file SMS a échoué. Aucun SMS n'a été créé." };
    }
    await completeCampaignSending(campaignId, org.id, queuedCount, user, campaign.name, "SMS");
    return { success: true };
  }

  try {
    const recipientMap = await initializeCampaignSending(
      campaignId,
      contacts,
      sender ?? { name: "WhatsApp", email: "", replyTo: null },
      campaign.channel as CampaignChannel,
    );
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

    await completeCampaignSending(campaignId, org.id, sentCount, user, campaign.name, campaign.channel as CampaignChannel);
    return { success: true };
  } catch (error) {
    if (error instanceof CampaignAlreadyClaimedError) {
      return { error: "La campagne est déjà en cours d'envoi." };
    }

    return {
      error: "L'envoi a été interrompu. La campagne reste verrouillée pour éviter tout double envoi.",
    };
  }
}
