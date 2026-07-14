"use server";

import { revalidatePath } from "next/cache";
import { createMailPulseApiKey, keyHash, keyPreview, type MailPulseApiEnvironment } from "@/lib/mailpulse/api-keys";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, getFeatureUpgradeMessage, type PlanTier } from "@/lib/plan-catalog";

async function getVerifiedSenderId(organizationId: string, senderId: string) {
  const sender = await prisma.emailSender.findFirst({
    where: { id: senderId, organizationId },
    select: { id: true, email: true },
  });
  const domain = sender?.email.split("@")[1]?.toLowerCase();
  if (!sender || !domain) return null;

  const verifiedDomain = await prisma.sendingDomain.findFirst({
    where: {
      organizationId,
      domain,
      verified: true,
      status: "verified",
    },
    select: { id: true },
  });

  return verifiedDomain ? sender.id : null;
}

export async function generateMailPulseApiKey(formData: FormData) {
  const { org } = await getCurrentUserAndOrg();
  if (org && !canAccessFeature(org.plan as PlanTier, "api_access")) return { error: getFeatureUpgradeMessage("api_access") };
  if (!org) return { error: "Organisation introuvable." };

  const environment = (formData.get("environment") === "TEST" ? "TEST" : "LIVE") as MailPulseApiEnvironment;
  const requestedSenderId = String(formData.get("defaultEmailSenderId") ?? "");
  const defaultEmailSenderId = requestedSenderId
    ? await getVerifiedSenderId(org.id, requestedSenderId)
    : null;

  if (requestedSenderId && !defaultEmailSenderId) {
    return { error: "Expéditeur invalide ou domaine non vérifié." };
  }

  const key = createMailPulseApiKey(environment);

  await prisma.integrationApiKey.create({
    data: {
      organizationId: org.id,
      provider: "MAILPULSE",
      environment,
      name: environment === "TEST" ? "MailPulse Test API" : "MailPulse Live API",
      defaultEmailSenderId,
      keyHash: keyHash(key),
      keyPrefix: keyPreview(key),
    },
  });

  revalidatePath("/dashboard/platform");
  return { key };
}

export async function updateMailPulseApiKeySender(formData: FormData) {
  const { org } = await getCurrentUserAndOrg();
  if (org && !canAccessFeature(org.plan as PlanTier, "api_access")) return { error: getFeatureUpgradeMessage("api_access") };
  if (!org) return { error: "Organisation introuvable." };

  const keyId = String(formData.get("keyId") ?? "");
  const requestedSenderId = String(formData.get("defaultEmailSenderId") ?? "");
  if (!keyId) return { error: "Clé introuvable." };

  const defaultEmailSenderId = requestedSenderId === "inherit"
    ? null
    : await getVerifiedSenderId(org.id, requestedSenderId);

  if (requestedSenderId !== "inherit" && !defaultEmailSenderId) {
    return { error: "Expéditeur invalide ou domaine non vérifié." };
  }

  await prisma.integrationApiKey.updateMany({
    where: { id: keyId, organizationId: org.id, provider: "MAILPULSE" },
    data: { defaultEmailSenderId },
  });

  revalidatePath("/dashboard/platform");
  return { success: true };
}

export async function revokeMailPulseApiKey(formData: FormData) {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Organisation introuvable." };

  const keyId = String(formData.get("keyId") ?? "");
  if (!keyId) return { error: "Clé introuvable." };

  const result = await prisma.integrationApiKey.updateMany({
    where: { id: keyId, organizationId: org.id, provider: "MAILPULSE", revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return { error: "Cette clé est introuvable ou déjà révoquée." };

  revalidatePath("/dashboard/platform");
  return { success: true };
}
