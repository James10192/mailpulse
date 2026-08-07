import { randomBytes } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

/** Error whose message is safe to surface to the user as-is (French, no internals). */
export class ActionGuardError extends Error {}

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
export function generateCredentialMaterial(prefix: "ck" | "fk") {
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
      provider: "META_WHATSAPP",
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

/** Maps any thrown error to a user-facing message without exposing internals. */
export function toActionError(error: unknown): { error: string } {
  if (error instanceof ActionGuardError) return { error: error.message };
  console.error(
    "[external-applications] action failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  return { error: "Une erreur inattendue est survenue. Réessayez dans quelques instants." };
}
