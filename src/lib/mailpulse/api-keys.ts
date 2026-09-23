import { prisma } from "@/lib/prisma";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";
import { normalizeApiKeyName } from "./api-key-name";
import { previewSecret, randomSecret, sha256 } from "./crypto";

export type MailPulseApiEnvironment = "LIVE" | "TEST";

export function createMailPulseApiKey(environment: MailPulseApiEnvironment = "LIVE") {
  const prefix = environment === "TEST" ? "mp_test" : "mp_live";
  return `${prefix}_${randomSecret()}`;
}

export function keyHash(key: string) {
  return sha256(key);
}

export function keyPreview(key: string) {
  return previewSecret(key);
}

export async function authenticateApiRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) return null;

  const integrationKey = await prisma.integrationApiKey.findFirst({
    where: {
      keyHash: keyHash(token),
      revokedAt: null,
      provider: { in: ["MAILPULSE", "FILON"] },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
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

  if (!integrationKey) return null;
  if (!canAccessFeature(integrationKey.organization.plan as PlanTier, "api_access")) return null;

  await prisma.integrationApiKey.update({
    where: { id: integrationKey.id },
    data: { lastUsedAt: new Date() },
  });

  return integrationKey;
}

/**
 * Renames a key of the given organization and provider. The name is free text,
 * not an identifier: two keys may share it (rotation creates the new key before
 * the old one is revoked), and a revoked key can still be renamed.
 */
export async function renameIntegrationApiKey(params: {
  organizationId: string;
  provider: "MAILPULSE" | "FILON";
  keyId: string;
  name: unknown;
}): Promise<{ name: string } | { error: string }> {
  const normalized = normalizeApiKeyName(params.name);
  if (!normalized.ok) return { error: normalized.error };
  if (!params.keyId) return { error: "Clé introuvable." };

  const result = await prisma.integrationApiKey.updateMany({
    where: { id: params.keyId, organizationId: params.organizationId, provider: params.provider },
    data: { name: normalized.name },
  });
  if (result.count === 0) return { error: "Clé introuvable." };
  return { name: normalized.name };
}
