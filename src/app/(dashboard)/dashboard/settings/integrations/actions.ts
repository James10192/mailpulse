"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, getFeatureUpgradeMessage, type PlanTier } from "@/lib/plan-catalog";
import { normalizeApiKeyName } from "@/lib/mailpulse/api-key-name";
import { renameIntegrationApiKey } from "@/lib/mailpulse/api-keys";
import {
  createFilonApiKey,
  hashIntegrationKey,
  keyPreview,
} from "@/lib/filon-recovery/auth";

export async function generateFilonIntegrationKey(formData: FormData) {
  const { org } = await getCurrentUserAndOrg();
  if (org && !canAccessFeature(org.plan as PlanTier, "recoveries")) return { error: getFeatureUpgradeMessage("recoveries") };
  if (!org) return { error: "Organisation introuvable." };
  const name = normalizeApiKeyName(formData.get("name"));
  if (!name.ok) return { error: name.error };

  const key = createFilonApiKey();
  await prisma.integrationApiKey.create({
    data: {
      provider: "FILON",
      name: name.name,
      keyHash: hashIntegrationKey(key),
      keyPrefix: keyPreview(key),
      organizationId: org.id,
    },
  });

  revalidatePath("/dashboard/settings/integrations");
  return { key };
}

export async function revokeFilonIntegrationKey(keyId: string) {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Organisation introuvable." };

  // Scoped to Filon keys: this screen must not be able to revoke a MailPulse API key.
  const result = await prisma.integrationApiKey.updateMany({
    where: { id: keyId, organizationId: org.id, provider: "FILON", revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (result.count === 0) return { error: "Cette clé est introuvable ou déjà révoquée." };

  revalidatePath("/dashboard/settings/integrations");
  return { success: true };
}

export async function renameFilonIntegrationKey(formData: FormData) {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Organisation introuvable." };

  const result = await renameIntegrationApiKey({
    organizationId: org.id,
    provider: "FILON",
    keyId: String(formData.get("keyId") ?? ""),
    name: formData.get("name"),
  });
  if ("error" in result) return result;

  revalidatePath("/dashboard/settings/integrations");
  return { success: true, name: result.name };
}
