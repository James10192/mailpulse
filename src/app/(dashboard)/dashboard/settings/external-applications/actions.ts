"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { encryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import {
  assertSenderIdUnambiguous,
  assertSingleActiveWhatsAppAccount,
  ensureEncryptionConfigured,
  generateCredentialMaterial,
  META_PROVIDER,
  requireApplication,
  requireOrganizationManager,
  toActionError,
} from "./guards";

const PAGE_PATH = "/dashboard/settings/external-applications";

const createApplicationSchema = z.object({
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9._-]{1,63}$/),
  name: z.string().trim().min(2).max(80),
});

export async function createExternalApplication(input: { key: string; name: string }) {
  try {
    const { org } = await requireOrganizationManager();
    ensureEncryptionConfigured();
    const parsed = createApplicationSchema.safeParse(input);
    if (!parsed.success) {
      return { error: "Renseignez une clé valide (minuscules, chiffres, . _ -) et un nom entre 2 et 80 caractères." };
    }

    const existing = await prisma.externalApplication.findUnique({
      where: { organizationId_key: { organizationId: org.id, key: parsed.data.key } },
      select: { id: true },
    });
    if (existing) return { error: "Une application avec cette clé existe déjà dans votre organisation." };

    const material = generateCredentialMaterial("ck");
    const application = await prisma.$transaction(async (tx) => {
      const created = await tx.externalApplication.create({
        data: { organizationId: org.id, key: parsed.data.key, name: parsed.data.name, active: true },
        select: { id: true, key: true },
      });
      await tx.externalApplicationCredential.create({
        data: {
          applicationId: created.id,
          purpose: "COMMAND_INGRESS",
          keyId: material.keyId,
          secretCiphertext: encryptExternalApplicationValue(material.secret),
          version: 1,
        },
      });
      return created;
    });

    revalidatePath(PAGE_PATH);
    return { applicationId: application.id, keyId: material.keyId, secret: material.secret };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rotateCommandCredential(applicationId: string) {
  try {
    const { org } = await requireOrganizationManager();
    ensureEncryptionConfigured();
    await requireApplication(org.id, applicationId);

    const material = generateCredentialMaterial("ck");
    const credential = await prisma.$transaction(async (tx) => {
      const latest = await tx.externalApplicationCredential.findFirst({
        where: { applicationId, purpose: "COMMAND_INGRESS" },
        orderBy: { version: "desc" },
        select: { version: true },
      });
      return tx.externalApplicationCredential.create({
        data: {
          applicationId,
          purpose: "COMMAND_INGRESS",
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

export async function revokeCommandCredential(applicationId: string, credentialId: string) {
  try {
    const { org } = await requireOrganizationManager();
    await requireApplication(org.id, applicationId);

    const revoked = await prisma.externalApplicationCredential.updateMany({
      where: { id: credentialId, applicationId, purpose: "COMMAND_INGRESS", revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (revoked.count === 0) return { error: "Ce credential est introuvable ou déjà révoqué." };

    revalidatePath(PAGE_PATH);
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

const metaAccountSchema = z.object({
  waba: z.string().trim().regex(/^\d{5,25}$/),
  phoneNumberId: z.string().trim().regex(/^\d{5,25}$/),
  accessToken: z.string().trim().min(10).max(4096).optional(),
  appSecret: z.string().trim().min(10).max(512).optional(),
  verifyToken: z.string().trim().min(8).max(512).optional(),
});

export async function setMetaProviderAccount(
  applicationId: string,
  input: { waba: string; phoneNumberId: string; accessToken: string; appSecret: string; verifyToken: string },
) {
  try {
    const { org } = await requireOrganizationManager();
    ensureEncryptionConfigured();
    await requireApplication(org.id, applicationId);

    const parsed = metaAccountSchema.safeParse({
      waba: input.waba,
      phoneNumberId: input.phoneNumberId,
      accessToken: input.accessToken.trim() === "" ? undefined : input.accessToken,
      appSecret: input.appSecret.trim() === "" ? undefined : input.appSecret,
      verifyToken: input.verifyToken.trim() === "" ? undefined : input.verifyToken,
    });
    if (!parsed.success) {
      return { error: "Vérifiez le WABA ID, le phone_number_id (chiffres uniquement) et la longueur des secrets." };
    }
    const { waba, phoneNumberId, accessToken, appSecret, verifyToken } = parsed.data;

    const providedSecrets = [accessToken, appSecret, verifyToken].filter(Boolean).length;
    if (providedSecrets !== 0 && providedSecrets !== 3) {
      return { error: "Fournissez le token d'accès, l'app secret et le verify token ensemble, ou laissez les trois vides." };
    }

    const existing = await prisma.providerAccount.findUnique({
      where: {
        organizationId_channel_provider_externalAccountId: {
          organizationId: org.id,
          channel: "WHATSAPP",
          provider: META_PROVIDER,
          externalAccountId: waba,
        },
      },
      select: { id: true, applicationId: true },
    });
    if (!existing && providedSecrets === 0) {
      return { error: "Le token d'accès, l'app secret et le verify token sont requis pour un nouveau compte Meta." };
    }
    // Re-parenting would break the other application's sends and reroute its
    // inbound messages here, so it is refused rather than done silently.
    if (existing?.applicationId && existing.applicationId !== applicationId) {
      return { error: "Ce compte WhatsApp Business est déjà rattaché à une autre application externe. Détachez-le avant de le réutiliser." };
    }

    await assertSenderIdUnambiguous(phoneNumberId, existing?.id);
    // Writing this account would otherwise leave two active WhatsApp accounts on
    // the application, which makes the outbound transport resolution fail closed.
    await assertSingleActiveWhatsAppAccount(applicationId, existing?.id);

    if (existing) {
      const credentialsCiphertext =
        providedSecrets === 3
          ? encryptExternalApplicationValue(JSON.stringify({ accessToken, appSecret, verifyToken }))
          : null;
      await prisma.providerAccount.update({
        where: { id: existing.id },
        data: {
          senderId: phoneNumberId,
          applicationId,
          active: true,
          ...(credentialsCiphertext ? { credentialsCiphertext } : {}),
        },
      });
    } else {
      await prisma.providerAccount.create({
        data: {
          organizationId: org.id,
          applicationId,
          channel: "WHATSAPP",
          provider: META_PROVIDER,
          externalAccountId: waba,
          senderId: phoneNumberId,
          credentialsCiphertext: encryptExternalApplicationValue(
            JSON.stringify({ accessToken, appSecret, verifyToken }),
          ),
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

export async function deactivateApplication(applicationId: string) {
  return setApplicationActive(applicationId, false);
}

export async function reactivateApplication(applicationId: string) {
  return setApplicationActive(applicationId, true);
}

async function setApplicationActive(applicationId: string, active: boolean) {
  try {
    const { org } = await requireOrganizationManager();
    const updated = await prisma.externalApplication.updateMany({
      where: { id: applicationId, organizationId: org.id },
      data: { active },
    });
    if (updated.count === 0) return { error: "Application externe introuvable." };

    revalidatePath(PAGE_PATH);
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}
