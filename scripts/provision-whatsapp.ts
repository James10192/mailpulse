import { randomBytes } from "node:crypto";

import type { PrismaClient } from "../src/generated/prisma/client.js";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { encryptExternalApplicationValue } from "../src/lib/external-applications/crypto.ts";

export const META_PROVIDER = "META_WHATSAPP";
export const BAILEYS_PROVIDER = "BAILEYS_WHATSAPP";
export const WHATSAPP_PROVIDERS = [META_PROVIDER, BAILEYS_PROVIDER];

const INSTANCE_NAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const SENDER_PATTERN = /^\d{6,20}$/;

/** Lines to print now, and secrets to print once at the very end of the run. */
export type ProvisionOutput = { logs: string[]; revealed: string[] };

/**
 * resolveWhatsAppProvider() binds an application to exactly one active WhatsApp
 * account and fails closed when a second one exists, so provisioning refuses the
 * conflict instead of writing a configuration that cannot send anything.
 */
export async function assertSingleActiveWhatsAppAccount(
  prisma: PrismaClient,
  applicationId: string,
  excludeAccountId?: string,
) {
  const conflicting = await prisma.providerAccount.findFirst({
    where: {
      applicationId,
      channel: "WHATSAPP",
      provider: { in: WHATSAPP_PROVIDERS },
      active: true,
      ...(excludeAccountId ? { id: { not: excludeAccountId } } : {}),
    },
    select: { id: true, provider: true },
  });
  if (conflicting) {
    throw new Error(
      `L'application porte déjà un compte WhatsApp actif (${conflicting.provider}, ProviderAccount ${conflicting.id}). Une application ne peut en avoir qu'un seul : désactivez celui-ci avant de relier l'autre transport.`,
    );
  }
}

export async function upsertBaileysProviderAccount(
  prisma: PrismaClient,
  options: {
    organizationId: string;
    applicationId: string;
    instanceName: string | undefined;
    sender: string | undefined;
    allowReassign: boolean;
  },
) {
  const instanceName = options.instanceName?.trim();
  if (!instanceName) throw new Error("--instance est requis avec --transport baileys (nom de l'instance Evolution).");
  if (!INSTANCE_NAME_PATTERN.test(instanceName)) {
    throw new Error(`Nom d'instance Evolution invalide : "${instanceName}". Lettres, chiffres, . _ - uniquement.`);
  }
  const senderId = options.sender?.trim() || null;
  if (senderId && !SENDER_PATTERN.test(senderId)) {
    throw new Error(`--sender invalide : "${senderId}". Format international sans le +.`);
  }

  const existing = await prisma.providerAccount.findUnique({
    where: {
      organizationId_channel_provider_externalAccountId: {
        organizationId: options.organizationId,
        channel: "WHATSAPP",
        provider: BAILEYS_PROVIDER,
        externalAccountId: instanceName,
      },
    },
    select: { id: true, applicationId: true },
  });

  // Silently re-parenting would break the previous application's outbound path
  // and reroute its parents' inbound messages to this one.
  if (existing?.applicationId && existing.applicationId !== options.applicationId && !options.allowReassign) {
    throw new Error(
      `L'instance Evolution ${instanceName} appartient déjà à l'application ${existing.applicationId}. Relancez avec --reassign-provider-account pour la transférer en connaissance de cause.`,
    );
  }

  // Evolution webhooks carry no signature: the instance name is the only routing
  // hint, so a duplicate active instance makes inbound resolution ambiguous.
  const conflicting = await prisma.providerAccount.findFirst({
    where: {
      channel: "WHATSAPP",
      provider: BAILEYS_PROVIDER,
      externalAccountId: instanceName,
      active: true,
      ...(existing ? { id: { not: existing.id } } : {}),
    },
    select: { id: true, organizationId: true },
  });
  if (conflicting) {
    throw new Error(
      `L'instance ${instanceName} est déjà portée par le ProviderAccount ${conflicting.id} (org ${conflicting.organizationId}). La résolution du webhook Baileys serait ambiguë : désactiver l'autre compte d'abord.`,
    );
  }

  await assertSingleActiveWhatsAppAccount(prisma, options.applicationId, existing?.id);

  const account = existing
    ? await prisma.providerAccount.update({
      where: { id: existing.id },
      data: { applicationId: options.applicationId, senderId, active: true },
      select: { id: true, senderId: true },
    })
    : await prisma.providerAccount.create({
      data: {
        organizationId: options.organizationId,
        applicationId: options.applicationId,
        channel: "WHATSAPP",
        provider: BAILEYS_PROVIDER,
        externalAccountId: instanceName,
        senderId,
        // Evolution's URL and key are global env configuration, so a Baileys
        // account holds no tenant secret at all.
        credentialsCiphertext: null,
        active: true,
      },
      select: { id: true, senderId: true },
    });

  return {
    account,
    log: `ProviderAccount Baileys : id=${account.id} instance=${instanceName} numéro=${account.senderId ?? "non défini"}`,
  };
}

/**
 * Evolution posts its webhooks without an HMAC signature, so this token carried
 * in the URL query is the only thing authenticating inbound traffic.
 */
export async function ensureInboundToken(
  prisma: PrismaClient,
  applicationId: string,
  rotate: boolean,
): Promise<ProvisionOutput> {
  const now = new Date();
  const active = await prisma.externalApplicationCredential.findFirst({
    where: {
      applicationId,
      purpose: "INBOUND_FORWARD",
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { version: "desc" },
    select: { keyId: true, version: true },
  });

  if (active && !rotate) {
    return {
      logs: [
        `Jeton INBOUND_FORWARD déjà actif : keyId=${active.keyId} (v${active.version}). Utiliser --rotate-inbound-token pour en générer un nouveau.`,
        `Webhook Evolution : ${inboundWebhookUrl(applicationId)}?token=<jeton-existant-non-réaffichable>`,
      ],
      revealed: [],
    };
  }

  const keyId = `ik_${randomBytes(8).toString("hex")}`;
  const secret = randomBytes(32).toString("base64url");
  const latest = await prisma.externalApplicationCredential.findFirst({
    where: { applicationId, purpose: "INBOUND_FORWARD" },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  await prisma.externalApplicationCredential.create({
    data: {
      applicationId,
      purpose: "INBOUND_FORWARD",
      keyId,
      secretCiphertext: encryptExternalApplicationValue(secret),
      version: (latest?.version ?? 0) + 1,
    },
  });

  return {
    logs: [],
    revealed: [
      `Jeton INBOUND_FORWARD ${active ? "(rotation, l'ancien reste actif jusqu'à révocation)" : "(nouveau)"} — URL à coller dans le champ Webhook de l'instance Evolution :`,
      `  ${inboundWebhookUrl(applicationId)}?token=${secret}`,
      `  keyId=${keyId}`,
    ],
  };
}

export function inboundWebhookUrl(applicationId: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${base.replace(/\/+$/, "")}/api/webhooks/whatsapp/baileys/${applicationId}`;
}
