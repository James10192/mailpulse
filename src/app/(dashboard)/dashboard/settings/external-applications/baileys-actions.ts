"use server";

import { revalidatePath } from "next/cache";

import {
  moveNumber,
  NumberBusyError,
  SENDER_MOVED_CODE,
  setDefaultNumber,
  setNumberActive,
  settleDefaultNumber,
  WhatsAppNumberError,
} from "@/lib/external-applications/whatsapp-numbers";
import { recordEventsAfterCommit, recordOperationEvents } from "@/lib/external-applications/events";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { API_KEY_NAME_MAX_LENGTH } from "@/lib/mailpulse/api-key-name";
import { encryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import {
  ActionGuardError,
  assertInstanceNameUnambiguous,
  BAILEYS_PROVIDER,
  ensureEncryptionConfigured,
  generateCredentialMaterial,
  requireApplication,
  requireOrganizationManager,
  toActionError,
  WHATSAPP_PROVIDERS,
} from "./guards";
import { isOrganizationPairingInstance, pointInstanceAtApplication } from "./pairing-webhook";

const PAGE_PATH = "/dashboard/settings/external-applications";
const NUMBERS_PATH = "/dashboard/messaging/numeros";
const MESSAGING_PATH = "/dashboard/messaging";
const INBOUND_PURPOSE = "INBOUND_FORWARD" as const;

const baileysAccountSchema = z.object({
  // Evolution instance names travel in URLs and payloads, so the character set
  // is kept deliberately narrow.
  instanceName: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/),
  // The connected WhatsApp number is informative only: Evolution addresses the
  // session by instance name, never by sender.
  senderId: z
    .string()
    .trim()
    .regex(/^\d{6,20}$/)
    .optional(),
});

export async function setBaileysProviderAccount(
  applicationId: string,
  input: { instanceName: string; senderId: string },
) {
  try {
    const { org } = await requireOrganizationManager();
    await requireApplication(org.id, applicationId);

    const parsed = baileysAccountSchema.safeParse({
      instanceName: input.instanceName,
      senderId: input.senderId.trim() === "" ? undefined : input.senderId,
    });
    if (!parsed.success) {
      return {
        error:
          "Renseignez un nom d'instance Evolution valide (lettres, chiffres, . _ -) et, si vous le connaissez, le numéro connecté au format international sans le +.",
      };
    }
    const { instanceName, senderId } = parsed.data;

    const existing = await prisma.providerAccount.findUnique({
      where: {
        organizationId_channel_provider_externalAccountId: {
          organizationId: org.id,
          channel: "WHATSAPP",
          provider: BAILEYS_PROVIDER,
          externalAccountId: instanceName,
        },
      },
      select: { id: true, applicationId: true },
    });
    // Re-parenting would reroute the other application's inbound messages here.
    if (existing?.applicationId && existing.applicationId !== applicationId) {
      return { error: "Cette instance Evolution est déjà rattachée à une autre application externe. Déplacez le numéro depuis Messagerie › Numéros." };
    }

    await assertInstanceNameUnambiguous(instanceName, existing?.id);

    // The account and the default it may settle are written together: no
    // moment where the application has two active numbers and no default.
    await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.providerAccount.update({
          where: { id: existing.id },
          data: { applicationId, senderId: senderId ?? null, active: true },
        });
      } else {
        await tx.providerAccount.create({
          data: {
            organizationId: org.id,
            applicationId,
            channel: "WHATSAPP",
            provider: BAILEYS_PROVIDER,
            externalAccountId: instanceName,
            senderId: senderId ?? null,
            // Evolution credentials are global env configuration, so nothing
            // tenant-specific is stored on the account.
            credentialsCiphertext: null,
            active: true,
          },
        });
      }
      await settleDefaultNumber(tx, { organizationId: org.id, applicationId });
    });
    revalidatePath(PAGE_PATH);
    revalidatePath(NUMBERS_PATH);
    revalidatePath(MESSAGING_PATH);
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Stops or resumes sending from a number. Disabling the default hands the role
 * to another active number of the application (settleDefaultNumber).
 */
export async function setProviderAccountActive(applicationId: string, accountId: string, active: boolean) {
  try {
    const { org } = await requireOrganizationManager();
    await requireApplication(org.id, applicationId);
    await prisma.$transaction((tx) => setNumberActive(tx, { organizationId: org.id, applicationId }, accountId, active));
    revalidatePath(PAGE_PATH);
    revalidatePath(NUMBERS_PATH);
    revalidatePath(MESSAGING_PATH);
    return { success: true };
  } catch (error) {
    if (error instanceof WhatsAppNumberError) return { error: error.message };
    return toActionError(error);
  }
}

/** Makes an active number the one requests use when they name none. */
export async function setDefaultProviderAccount(applicationId: string, accountId: string) {
  try {
    const { org } = await requireOrganizationManager();
    await requireApplication(org.id, applicationId);
    await prisma.$transaction((tx) => setDefaultNumber(tx, { organizationId: org.id, applicationId }, accountId));
    revalidatePath(PAGE_PATH);
    revalidatePath(NUMBERS_PATH);
    revalidatePath(MESSAGING_PATH);
    return { success: true };
  } catch (error) {
    if (error instanceof WhatsAppNumberError) return { error: error.message };
    return toActionError(error);
  }
}

export type OpenSendView = { id: string; kind: "operation" | "consent"; status: string; operationKey: string | null; createdAt: string };

/**
 * Hands a number to another application of the organization. Its replies and
 * delivery receipts follow it: a Baileys instance is re-pointed at the new
 * application's webhook inside the move, so a failed re-point moves nothing
 * and replies never reach an application that no longer holds the number.
 *
 * Sends still without an outcome are returned (`busy`) for the person to see;
 * calling again with `stopOpenSends` closes them and moves in one step.
 */
export async function moveProviderAccount(
  applicationId: string,
  accountId: string,
  targetApplicationId: string,
  stopOpenSends = false,
): Promise<{ success: true; stopped: number } | { busy: OpenSendView[] } | { error: string }> {
  let repointed: string | null = null;
  try {
    const { user, org } = await requireOrganizationManager();
    await requireApplication(org.id, applicationId);
    await requireApplication(org.id, targetApplicationId);

    const account = await prisma.providerAccount.findFirst({
      where: { id: accountId, organizationId: org.id, applicationId, channel: "WHATSAPP", provider: { in: WHATSAPP_PROVIDERS } },
      select: { provider: true, externalAccountId: true },
    });
    if (!account) return { error: "Compte WhatsApp introuvable pour cette application." };

    let outcome: Awaited<ReturnType<typeof moveNumber>>;
    try {
      outcome = await prisma.$transaction(
        async (tx) => {
          const moved = await moveNumber(
            tx,
            { organizationId: org.id, applicationId, toApplicationId: targetApplicationId },
            accountId,
            { stopOpenSendsBy: stopOpenSends ? user.id : undefined },
          );
          await tx.auditLog.create({
            data: {
              actorType: "user",
              actorId: user.id,
              action: "WHATSAPP_NUMBER_MOVED",
              resourceType: "provider_account",
              resourceId: accountId,
              metadata: { fromApplicationId: applicationId, toApplicationId: targetApplicationId, stoppedSends: moved.stopped },
              organizationId: org.id,
            },
          });
          if (account.provider === BAILEYS_PROVIDER) {
            await pointInstanceAtApplication(account.externalAccountId, targetApplicationId).catch((error: unknown) => {
              if (error instanceof ActionGuardError) throw error;
              console.error("[external-applications] webhook non repointé, déplacement annulé", {
                applicationId: targetApplicationId,
                error: error instanceof Error ? error.message : "unknown",
              });
              throw new ActionGuardError("WhatsApp n'a pas pu être redirigé vers cette application : le numéro n'a pas été déplacé. Réessayez dans quelques instants.");
            });
            repointed = account.externalAccountId;
          }
          return moved;
        },
        { timeout: 20_000 },
      );
    } catch (error) {
      // The webhook moved but the move did not commit: point it back.
      if (repointed) await pointInstanceAtApplication(repointed, applicationId).catch(() => {});
      throw error;
    }

    // The source application's client learns that the commands it sent will not leave.
    if (outcome.rejectedOperationIds.length > 0) {
      await recordEventsAfterCommit("message.failed", () => recordOperationEvents(
        prisma,
        { organizationId: org.id, applicationId, providerAccountId: accountId },
        "message.failed",
        outcome.rejectedOperationIds,
        { occurredAt: new Date(), failureCode: SENDER_MOVED_CODE },
      ));
    }

    revalidatePath(PAGE_PATH);
    revalidatePath(NUMBERS_PATH);
    revalidatePath(MESSAGING_PATH);
    return { success: true, stopped: outcome.stopped };
  } catch (error) {
    if (error instanceof NumberBusyError) {
      return {
        busy: error.sends.map((send) => ({
          id: send.id,
          kind: send.kind,
          status: send.status,
          operationKey: send.operationKey,
          createdAt: send.createdAt.toISOString(),
        })),
      };
    }
    if (error instanceof WhatsAppNumberError) return { error: error.message };
    return toActionError(error);
  }
}

/**
 * Names the number ("ESBTP Yakro"): shown wherever messages are traced and
 * copied into each message's sender snapshot. An empty name clears it.
 */
export async function renameProviderAccount(applicationId: string, accountId: string, rawLabel: string) {
  try {
    const { org } = await requireOrganizationManager();
    await requireApplication(org.id, applicationId);

    const label = rawLabel.replace(/\s+/g, " ").trim();
    // Same cap as the shared name editor that submits it.
    if (label.length > API_KEY_NAME_MAX_LENGTH) return { error: `Le nom du numéro ne doit pas dépasser ${API_KEY_NAME_MAX_LENGTH} caractères.` };

    const updated = await prisma.providerAccount.updateMany({
      where: { id: accountId, applicationId, organizationId: org.id, channel: "WHATSAPP", provider: { in: WHATSAPP_PROVIDERS } },
      data: { label: label || null },
    });
    if (updated.count === 0) return { error: "Compte WhatsApp introuvable pour cette application." };

    revalidatePath(PAGE_PATH);
    revalidatePath(NUMBERS_PATH);
    revalidatePath(MESSAGING_PATH);
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Evolution posts its webhooks without an HMAC signature, so this token carried
 * in the URL query is the only thing authenticating inbound traffic.
 */
export async function rotateInboundToken(applicationId: string) {
  try {
    const { org } = await requireOrganizationManager();
    ensureEncryptionConfigured();
    await requireApplication(org.id, applicationId);

    const material = generateCredentialMaterial("ik");
    const credential = await prisma.$transaction(async (tx) => {
      const latest = await tx.externalApplicationCredential.findFirst({
        where: { applicationId, purpose: INBOUND_PURPOSE },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      return tx.externalApplicationCredential.create({
        data: {
          applicationId,
          purpose: INBOUND_PURPOSE,
          keyId: material.keyId,
          secretCiphertext: encryptExternalApplicationValue(material.secret),
          version: (latest?.version ?? 0) + 1,
        },
        select: { version: true },
      });
    });

    // Instances MailPulse paired for this application present the token
    // themselves: hand them the new one, so revoking the old one later does not
    // silently cut the replies. Instances linked by hand are the operator's.
    await repointPairedInstances(org.id, applicationId);

    revalidatePath(PAGE_PATH);
    revalidatePath(NUMBERS_PATH);
    revalidatePath(MESSAGING_PATH);
    return { keyId: material.keyId, secret: material.secret, version: credential.version };
  } catch (error) {
    return toActionError(error);
  }
}

export async function revokeInboundToken(applicationId: string, credentialId: string) {
  try {
    const { org } = await requireOrganizationManager();
    await requireApplication(org.id, applicationId);

    const revoked = await prisma.externalApplicationCredential.updateMany({
      where: { id: credentialId, applicationId, purpose: INBOUND_PURPOSE, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) return { error: "Ce jeton est introuvable ou déjà révoqué." };

    revalidatePath(PAGE_PATH);
    revalidatePath(NUMBERS_PATH);
    revalidatePath(MESSAGING_PATH);
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

async function repointPairedInstances(organizationId: string, applicationId: string) {
  const accounts = await prisma.providerAccount.findMany({
    where: { organizationId, applicationId, channel: "WHATSAPP", provider: BAILEYS_PROVIDER },
    select: { externalAccountId: true },
  });
  for (const { externalAccountId } of accounts) {
    if (!(await isOrganizationPairingInstance(organizationId, externalAccountId))) continue;
    await pointInstanceAtApplication(externalAccountId, applicationId).catch((error: unknown) => {
      console.error("[external-applications] webhook non repointé", { applicationId, error: error instanceof Error ? error.message : "unknown" });
    });
  }
}
