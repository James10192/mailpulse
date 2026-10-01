"use server";

import { revalidatePath } from "next/cache";
import { normalizeApiKeyName } from "@/lib/mailpulse/api-key-name";
import { createMailPulseApiKey, keyHash, keyPreview, renameIntegrationApiKey, type MailPulseApiEnvironment } from "@/lib/mailpulse/api-keys";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { managerOnlyRefusal } from "@/lib/access/manager-only";
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
  const context = await getCurrentUserAndOrg();
  const { org } = context;
  if (org && !canAccessFeature(org.plan as PlanTier, "api_access")) return { error: getFeatureUpgradeMessage("api_access") };
  if (!org) return { error: "Organisation introuvable." };
  const refusal = managerOnlyRefusal(context);
  if (refusal) return refusal;

  const name = normalizeApiKeyName(formData.get("name"));
  if (!name.ok) return { error: name.error };
  const environment = (formData.get("environment") === "TEST" ? "TEST" : "LIVE") as MailPulseApiEnvironment;
  // "inherit" (or nothing) means the organization's default sender, as on rename.
  const rawSenderId = String(formData.get("defaultEmailSenderId") ?? "");
  const requestedSenderId = rawSenderId === "inherit" ? "" : rawSenderId;
  const defaultEmailSenderId = requestedSenderId
    ? await getVerifiedSenderId(org.id, requestedSenderId)
    : null;

  if (requestedSenderId && !defaultEmailSenderId) {
    return { error: "Expéditeur invalide ou domaine non vérifié." };
  }

  const application = await requestedApplication(org.id, formData.get("applicationId"), name.name);
  if ("error" in application) return application;

  const key = createMailPulseApiKey(environment);

  await prisma.integrationApiKey.create({
    data: {
      organizationId: org.id,
      provider: "MAILPULSE",
      environment,
      name: name.name,
      applicationId: application.id,
      defaultEmailSenderId,
      keyHash: keyHash(key),
      keyPrefix: keyPreview(key),
    },
  });

  revalidatePath("/dashboard/platform");
  return { key };
}

export async function renameMailPulseApiKey(formData: FormData) {
  const context = await getCurrentUserAndOrg();
  const { org } = context;
  if (org && !canAccessFeature(org.plan as PlanTier, "api_access")) return { error: getFeatureUpgradeMessage("api_access") };
  if (!org) return { error: "Organisation introuvable." };
  const refusal = managerOnlyRefusal(context);
  if (refusal) return refusal;

  const result = await renameIntegrationApiKey({
    organizationId: org.id,
    provider: "MAILPULSE",
    keyId: String(formData.get("keyId") ?? ""),
    name: formData.get("name"),
  });
  if ("error" in result) return result;

  revalidatePath("/dashboard/platform");
  return { success: true, name: result.name };
}

export async function updateMailPulseApiKeySender(formData: FormData) {
  const context = await getCurrentUserAndOrg();
  const { org } = context;
  if (org && !canAccessFeature(org.plan as PlanTier, "api_access")) return { error: getFeatureUpgradeMessage("api_access") };
  if (!org) return { error: "Organisation introuvable." };
  const refusal = managerOnlyRefusal(context);
  if (refusal) return refusal;

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
  const context = await getCurrentUserAndOrg();
  const { org } = context;
  if (!org) return { error: "Organisation introuvable." };
  const refusal = managerOnlyRefusal(context);
  if (refusal) return refusal;

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

/**
 * Attaches a key to an application, or detaches it ("none"): its WhatsApp
 * messages then leave from that application's number, or the organization's.
 */
export async function updateMailPulseApiKeyApplication(formData: FormData) {
  const context = await getCurrentUserAndOrg();
  const { org } = context;
  if (org && !canAccessFeature(org.plan as PlanTier, "api_access")) return { error: getFeatureUpgradeMessage("api_access") };
  if (!org) return { error: "Organisation introuvable." };
  const refusal = managerOnlyRefusal(context);
  if (refusal) return refusal;

  const keyId = String(formData.get("keyId") ?? "");
  const raw = String(formData.get("applicationId") ?? "");
  const applicationId = raw === NO_APPLICATION ? null : await activeApplicationId(org.id, raw);
  if (raw !== NO_APPLICATION && !applicationId) return { error: "Application introuvable ou désactivée." };

  const result = await prisma.integrationApiKey.updateMany({
    where: { id: keyId, organizationId: org.id, provider: "MAILPULSE", revokedAt: null },
    data: { applicationId },
  });
  if (result.count === 0) return { error: "Clé introuvable." };

  revalidatePath("/dashboard/platform");
  return { success: true };
}

const NO_APPLICATION = "none";
const APPLICATION_BY_NAME = "auto";

/**
 * The application a new key speaks for: the one chosen, none, or by default
 * the application of the keys already carrying its name.
 */
async function requestedApplication(organizationId: string, raw: FormDataEntryValue | null, name: string): Promise<{ id: string | null } | { error: string }> {
  const value = typeof raw === "string" && raw ? raw : APPLICATION_BY_NAME;
  if (value === NO_APPLICATION) return { id: null };
  if (value === APPLICATION_BY_NAME) return { id: await applicationOfKeysNamed(organizationId, name) };
  const id = await activeApplicationId(organizationId, value);
  return id ? { id } : { error: "Application introuvable ou désactivée." };
}

/** Only an active application of the organization: a disabled one would refuse the key. */
async function activeApplicationId(organizationId: string, applicationId: string) {
  if (!applicationId) return null;
  const application = await prisma.externalApplication.findFirst({
    where: { id: applicationId, organizationId, active: true },
    select: { id: true },
  });
  return application?.id ?? null;
}

/**
 * A key created under the name of an attached key joins the same application,
 * so a rotation (new key, then revoke the old one) keeps the application's
 * WhatsApp number instead of falling back to the organization's. Same grouping
 * as scripts/attach-api-keys-to-applications.ts.
 */
async function applicationOfKeysNamed(organizationId: string, name: string) {
  const sibling = await prisma.integrationApiKey.findFirst({
    where: {
      organizationId,
      provider: "MAILPULSE",
      applicationId: { not: null },
      name: { equals: name, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    select: { applicationId: true },
  });
  return sibling?.applicationId ?? null;
}
