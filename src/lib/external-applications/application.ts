import { decryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import { hasValidMetaHmac } from "@/lib/external-applications/signatures";
import { prisma } from "@/lib/prisma";

const META_PROVIDER = "META_WHATSAPP";

export const BAILEYS_PROVIDER = "BAILEYS_WHATSAPP";

export type ExternalApplicationContext = {
  id: string;
  key: string;
  organizationId: string;
};

export type MetaProviderConfiguration = {
  id: string;
  senderId: string;
  accessToken: string;
  appSecret: string;
  verifyToken: string;
};

/**
 * Evolution API bridges a WhatsApp Web session, so the instance name is the
 * whole addressing story: there is no token, no app secret and no approved
 * template to resolve.
 */
export type BaileysProviderConfiguration = {
  id: string;
  senderId: string | null;
  instanceName: string;
};

export type ExternalWhatsAppProvider =
  | ({ kind: "meta" } & MetaProviderConfiguration)
  | ({ kind: "baileys" } & BaileysProviderConfiguration);

export async function resolveExternalApplication(organizationId: string, applicationKey: string) {
  return prisma.externalApplication.findFirst({
    where: { organizationId, key: applicationKey, active: true },
    select: { id: true, key: true, organizationId: true },
  });
}

/**
 * Resolves the globally unique opaque identifier embedded in a provider webhook
 * URL. Application keys are organization-scoped and must never be used here.
 */
export async function resolveExternalApplicationByOpaqueId(applicationId: string) {
  return prisma.externalApplication.findFirst({
    where: { id: applicationId, active: true },
    select: { id: true, key: true, organizationId: true },
  });
}

export async function resolveExternalApplicationRequestTarget(applicationKey: string, organizationId: string | null) {
  return (await resolveExternalApplicationByOpaqueId(applicationKey))
    ?? (organizationId ? resolveExternalApplication(organizationId, applicationKey) : null);
}

/**
 * Meta does not send tenant headers. Its signed payload gives us the sender
 * phone_number_id, which is sufficient only after exactly one active account
 * verifies the HMAC. Ambiguous or invalid candidates fail closed.
 */
export async function resolveMetaApplicationBySenderHmac(rawBody: string, signature: string | null, senderIds: readonly string[]) {
  if (senderIds.length === 0) return null;

  const accounts = await prisma.providerAccount.findMany({
    where: {
      channel: "WHATSAPP",
      provider: META_PROVIDER,
      active: true,
      senderId: { in: [...new Set(senderIds)] },
      application: { is: { active: true } },
    },
    select: {
      id: true,
      senderId: true,
      credentialsCiphertext: true,
      application: { select: { id: true, key: true, organizationId: true } },
    },
  });

  const matches: ExternalApplicationContext[] = [];
  for (const account of accounts) {
    if (!account.application || !account.credentialsCiphertext) continue;
    try {
      const credentials = parseMetaCredentials(decryptExternalApplicationValue(account.credentialsCiphertext));
      if (hasValidMetaHmac(signature, credentials.appSecret, rawBody)) matches.push(account.application);
    } catch {
      // An invalid account configuration must not make another account match.
    }
  }

  return matches.length === 1 ? matches[0] : null;
}

export async function resolveCommandCredential(applicationId: string, keyId: string, now = new Date()) {
  const credentials = await prisma.externalApplicationCredential.findMany({
    where: {
      applicationId,
      purpose: "COMMAND_INGRESS",
      keyId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { version: "desc" },
    take: 2,
  });
  return credentials.length === 1 ? credentials[0] : null;
}

export async function resolveMetaProviderAccount(application: ExternalApplicationContext, senderId?: string): Promise<MetaProviderConfiguration | null> {
  const accounts = await prisma.providerAccount.findMany({
    where: {
      organizationId: application.organizationId,
      applicationId: application.id,
      channel: "WHATSAPP",
      provider: META_PROVIDER,
      active: true,
      ...(senderId ? { senderId } : {}),
    },
    select: { id: true, senderId: true, credentialsCiphertext: true },
    take: 2,
  });
  const account = accounts.length === 1 ? accounts[0] : null;
  if (!account?.senderId || !account.credentialsCiphertext) return null;

  const credentials = parseMetaCredentials(decryptExternalApplicationValue(account.credentialsCiphertext));
  return { id: account.id, senderId: account.senderId, ...credentials };
}

/**
 * An application is bound to exactly one active WhatsApp account, whichever
 * transport it runs on. Two accounts would make an outbound command ambiguous,
 * so the resolution fails closed rather than picking one.
 */
export async function resolveWhatsAppProvider(application: ExternalApplicationContext): Promise<ExternalWhatsAppProvider | null> {
  const accounts = await prisma.providerAccount.findMany({
    where: {
      organizationId: application.organizationId,
      applicationId: application.id,
      channel: "WHATSAPP",
      provider: { in: [META_PROVIDER, BAILEYS_PROVIDER] },
      active: true,
    },
    select: { id: true, provider: true, senderId: true, externalAccountId: true, credentialsCiphertext: true },
    take: 2,
  });
  const account = accounts.length === 1 ? accounts[0] : null;
  if (!account) return null;

  if (account.provider === BAILEYS_PROVIDER) {
    return account.externalAccountId
      ? { kind: "baileys", id: account.id, senderId: account.senderId, instanceName: account.externalAccountId }
      : null;
  }

  if (!account.senderId || !account.credentialsCiphertext) return null;
  const credentials = parseMetaCredentials(decryptExternalApplicationValue(account.credentialsCiphertext));
  return { kind: "meta", id: account.id, senderId: account.senderId, ...credentials };
}

/**
 * Rooted on the opaque application id from the URL, never on the instance name
 * alone: instance names are only unique per organization, so resolving by name
 * would let anyone who registers a homonym instance take another tenant's
 * inbound channel down. Evolution signs nothing, so the caller must still
 * verify the per-application inbound token.
 */
export async function resolveBaileysWebhookTarget(applicationId: string, instanceName: string) {
  if (!applicationId || !instanceName) return null;

  const application = await resolveExternalApplicationByOpaqueId(applicationId);
  if (!application) return null;

  const account = await prisma.providerAccount.findFirst({
    where: {
      organizationId: application.organizationId,
      applicationId: application.id,
      channel: "WHATSAPP",
      provider: BAILEYS_PROVIDER,
      active: true,
      externalAccountId: instanceName,
    },
    select: { id: true },
  });

  return account ? { application, providerAccountId: account.id } : null;
}

function parseMetaCredentials(value: string): Omit<MetaProviderConfiguration, "id" | "senderId"> {
  const parsed: unknown = JSON.parse(value);
  if (
    !isRecord(parsed)
    || typeof parsed.accessToken !== "string"
    || typeof parsed.appSecret !== "string"
    || typeof parsed.verifyToken !== "string"
    || !parsed.accessToken
    || !parsed.appSecret
    || !parsed.verifyToken
  ) {
    throw new Error("Invalid Meta provider credentials.");
  }
  return { accessToken: parsed.accessToken, appSecret: parsed.appSecret, verifyToken: parsed.verifyToken };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
