import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

/** Error whose message is safe to surface to the user as-is (French, no internals). */
export class ActionGuardError extends Error {}

export const META_PROVIDER = "META_WHATSAPP";
export const BAILEYS_PROVIDER = "BAILEYS_WHATSAPP";
export const WHATSAPP_PROVIDERS = [META_PROVIDER, BAILEYS_PROVIDER];

/** Only owners and admins may provision or mutate external applications. */
export async function requireOrganizationManager() {
  const { user, org, isAdmin, memberRole } = await getCurrentUserAndOrg();
  if (!user || !org) {
    throw new ActionGuardError("Votre session a expiré. Reconnectez-vous puis réessayez.");
  }
  if (!isAdmin && memberRole !== "owner") {
    throw new ActionGuardError("Cette action est réservée aux propriétaires et administrateurs de l'organisation.");
  }
  return { user, org };
}

/** Fails fast with a user-safe message before any secret would need encrypting. */
export function ensureEncryptionConfigured() {
  const encoded = process.env.EXTERNAL_APPLICATION_KEK;
  if (!encoded || Buffer.from(encoded, "base64").length !== 32) {
    throw new ActionGuardError("La configuration de chiffrement du serveur est incomplète. Contactez le support.");
  }
}

/** Same key material shape as scripts/provision-external-application.ts. */
export function generateCredentialMaterial(prefix: "ck" | "fk" | "ik") {
  return {
    keyId: `${prefix}_${randomBytes(8).toString("hex")}`,
    secret: randomBytes(32).toString("base64url"),
  };
}

/** Resolves an application owned by the organization or throws a user-safe error. */
export async function requireApplication(organizationId: string, applicationId: string) {
  const application = await prisma.externalApplication.findFirst({
    where: { id: applicationId, organizationId },
    select: { id: true, key: true, active: true },
  });
  if (!application) throw new ActionGuardError("Application externe introuvable.");
  return application;
}

/**
 * A second active account carrying the same phone_number_id would make the
 * Meta webhook resolution ambiguous and fail closed for both applications.
 */
export async function assertSenderIdUnambiguous(senderId: string, excludeAccountId?: string) {
  const conflicting = await prisma.providerAccount.findFirst({
    where: {
      channel: "WHATSAPP",
      provider: META_PROVIDER,
      senderId,
      active: true,
      ...(excludeAccountId ? { id: { not: excludeAccountId } } : {}),
    },
    select: { id: true },
  });
  if (conflicting) {
    // The lookup is deliberately global because Meta webhook resolution is, but
    // the message must not reveal whether another organization holds the number.
    throw new ActionGuardError(
      "Ce phone_number_id ne peut pas être utilisé ici. Vérifiez le numéro, ou contactez le support s'il vous appartient.",
    );
  }
}

const TRANSPORT_LABEL: Record<string, string> = {
  [META_PROVIDER]: "Meta Cloud API",
  [BAILEYS_PROVIDER]: "Baileys (Evolution API)",
};

/**
 * resolveWhatsAppProvider() binds an application to exactly one active WhatsApp
 * account and fails closed when a second one exists, so the conflict is refused
 * here rather than persisted as a silently broken configuration.
 */
export async function assertSingleActiveWhatsAppAccount(applicationId: string, excludeAccountId?: string) {
  const conflicting = await prisma.providerAccount.findFirst({
    where: {
      applicationId,
      channel: "WHATSAPP",
      provider: { in: WHATSAPP_PROVIDERS },
      active: true,
      ...(excludeAccountId ? { id: { not: excludeAccountId } } : {}),
    },
    select: { provider: true },
  });
  if (conflicting) {
    throw new ActionGuardError(
      `Cette application utilise déjà le transport ${TRANSPORT_LABEL[conflicting.provider] ?? conflicting.provider}. Désactivez ce compte avant d'en relier un autre : une application ne peut avoir qu'un seul compte WhatsApp actif.`,
    );
  }
}

/**
 * Evolution posts webhooks without a signature, so the instance name is the only
 * routing hint. Two active accounts sharing it would make inbound resolution
 * ambiguous and fail closed for both applications.
 */
export async function assertInstanceNameUnambiguous(instanceName: string, excludeAccountId?: string) {
  const conflicting = await prisma.providerAccount.findFirst({
    where: {
      channel: "WHATSAPP",
      provider: BAILEYS_PROVIDER,
      externalAccountId: instanceName,
      active: true,
      ...(excludeAccountId ? { id: { not: excludeAccountId } } : {}),
    },
    select: { id: true },
  });
  if (conflicting) {
    // Global on purpose, like the inbound resolution, but the message must not
    // reveal whether another organization holds the instance.
    throw new ActionGuardError(
      "Ce nom d'instance Evolution ne peut pas être utilisé ici. Choisissez un nom unique, ou contactez le support s'il vous appartient.",
    );
  }
}

/** Maps any thrown error to a user-facing message without exposing internals. */
export function toActionError(error: unknown): { error: string } {
  if (error instanceof ActionGuardError) return { error: error.message };
  console.error(
    "[external-applications] action failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  return { error: "Une erreur inattendue est survenue. Réessayez dans quelques instants." };
}
