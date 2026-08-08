"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { encryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import {
  assertInstanceNameUnambiguous,
  assertSingleActiveWhatsAppAccount,
  BAILEYS_PROVIDER,
  ensureEncryptionConfigured,
  generateCredentialMaterial,
  requireApplication,
  requireOrganizationManager,
  toActionError,
  WHATSAPP_PROVIDERS,
} from "./guards";

const PAGE_PATH = "/dashboard/settings/external-applications";
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
      return { error: "Cette instance Evolution est déjà rattachée à une autre application externe. Détachez-la avant de la réutiliser." };
    }

    await assertInstanceNameUnambiguous(instanceName, existing?.id);
    await assertSingleActiveWhatsAppAccount(applicationId, existing?.id);

    if (existing) {
      await prisma.providerAccount.update({
        where: { id: existing.id },
        data: { applicationId, senderId: senderId ?? null, active: true },
      });
    } else {
      await prisma.providerAccount.create({
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

    revalidatePath(PAGE_PATH);
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

/** Frees the application so the other transport can be connected. */
export async function setProviderAccountActive(applicationId: string, accountId: string, active: boolean) {
  try {
    const { org } = await requireOrganizationManager();
    await requireApplication(org.id, applicationId);

    if (active) await assertSingleActiveWhatsAppAccount(applicationId, accountId);

    const updated = await prisma.providerAccount.updateMany({
      where: {
        id: accountId,
        applicationId,
        organizationId: org.id,
        channel: "WHATSAPP",
        provider: { in: WHATSAPP_PROVIDERS },
      },
      data: { active },
    });
    if (updated.count === 0) return { error: "Compte WhatsApp introuvable pour cette application." };

    revalidatePath(PAGE_PATH);
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

    revalidatePath(PAGE_PATH);
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
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}
