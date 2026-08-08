"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { encryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import { assertSafeCallbackUrl } from "@/lib/external-applications/network";
import {
  BAILEYS_PROVIDER,
  ensureEncryptionConfigured,
  generateCredentialMaterial,
  requireApplication,
  requireOrganizationManager,
  toActionError,
  WHATSAPP_PROVIDERS,
} from "./guards";

const PAGE_PATH = "/dashboard/settings/external-applications";
const UNSAFE_URL_ERROR =
  "URL de rappel refusée : HTTPS public uniquement, sans port explicite, identifiants ni fragment.";

const forwardEndpointSchema = z.object({
  url: z.string().trim().url().max(2048),
  events: z
    .array(z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{1,63}$/))
    .min(1)
    .max(10),
});

export async function upsertForwardEndpoint(applicationId: string, input: { url: string; events: string[] }) {
  try {
    const { org } = await requireOrganizationManager();
    ensureEncryptionConfigured();
    await requireApplication(org.id, applicationId);

    const parsed = forwardEndpointSchema.safeParse(input);
    if (!parsed.success) {
      return { error: "Renseignez une URL HTTPS valide et au moins un événement (minuscules, chiffres, . _ -)." };
    }
    const url = parsed.data.url;
    const events = Array.from(new Set(parsed.data.events));

    try {
      await assertSafeCallbackUrl(url);
    } catch {
      return { error: UNSAFE_URL_ERROR };
    }

    const existing = await prisma.applicationForwardEndpoint.findUnique({
      where: { applicationId_url: { applicationId, url } },
      select: { id: true },
    });

    if (existing) {
      await prisma.applicationForwardEndpoint.update({
        where: { id: existing.id },
        data: { events, active: true },
      });
      revalidatePath(PAGE_PATH);
      return { updated: true };
    }

    const material = generateCredentialMaterial("fk");
    await prisma.applicationForwardEndpoint.create({
      data: {
        organizationId: org.id,
        applicationId,
        url,
        keyId: material.keyId,
        secretCiphertext: encryptExternalApplicationValue(material.secret),
        events,
        active: true,
      },
    });

    revalidatePath(PAGE_PATH);
    return { keyId: material.keyId, secret: material.secret };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rotateForwardSecret(endpointId: string) {
  try {
    const { org } = await requireOrganizationManager();
    ensureEncryptionConfigured();

    const endpoint = await prisma.applicationForwardEndpoint.findFirst({
      where: { id: endpointId, organizationId: org.id },
      select: { id: true },
    });
    if (!endpoint) return { error: "Endpoint de rappel introuvable." };

    const material = generateCredentialMaterial("fk");
    await prisma.applicationForwardEndpoint.update({
      where: { id: endpoint.id },
      data: { keyId: material.keyId, secretCiphertext: encryptExternalApplicationValue(material.secret) },
    });

    revalidatePath(PAGE_PATH);
    return { keyId: material.keyId, secret: material.secret };
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleForwardEndpoint(endpointId: string, active: boolean) {
  try {
    const { org } = await requireOrganizationManager();
    const updated = await prisma.applicationForwardEndpoint.updateMany({
      where: { id: endpointId, organizationId: org.id },
      data: { active },
    });
    if (updated.count === 0) return { error: "Endpoint de rappel introuvable." };

    revalidatePath(PAGE_PATH);
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

const templateConfigBase = {
  operationKey: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{1,99}$/),
  locale: z.string().trim().regex(/^[a-z]{2}(?:_[A-Z]{2})?$/),
};

/** Meta resolves an approved template by identifier. */
const metaTemplateSchema = z.object({
  ...templateConfigBase,
  providerTemplateId: z.string().trim().regex(/^[A-Za-z0-9._-]{1,200}$/),
});

/**
 * Baileys has no template registry, so the field carries the message body with
 * {{1}}, {{2}}... markers substituted at send time. Control characters other
 * than newlines are rejected so a body cannot smuggle framing into the payload.
 */
const baileysTemplateSchema = z.object({
  ...templateConfigBase,
  providerTemplateId: z
    .string()
    .trim()
    .min(1)
    .max(1000)
    .refine((value) => !/[\u0000-\u0008\u000B-\u001F\u007F]/.test(value)),
});

/** The transport is a property of the application's single active WhatsApp account. */
async function resolveActiveTransport(applicationId: string) {
  const account = await prisma.providerAccount.findFirst({
    where: {
      applicationId,
      channel: "WHATSAPP",
      provider: { in: WHATSAPP_PROVIDERS },
      active: true,
    },
    select: { provider: true },
  });
  return account?.provider === BAILEYS_PROVIDER ? "BAILEYS" : "META";
}

export async function upsertTemplateConfig(
  applicationId: string,
  input: { operationKey: string; locale: string; providerTemplateId: string },
) {
  try {
    const { org } = await requireOrganizationManager();
    await requireApplication(org.id, applicationId);

    const transport = await resolveActiveTransport(applicationId);
    const parsed = (transport === "BAILEYS" ? baileysTemplateSchema : metaTemplateSchema).safeParse(input);
    if (!parsed.success) {
      return {
        error:
          transport === "BAILEYS"
            ? "Vérifiez la clé d'opération, la locale (ex. fr ou fr_FR) et le corps du message (1 à 1000 caractères)."
            : "Vérifiez la clé d'opération, la locale (ex. fr ou fr_FR) et l'identifiant du template Meta.",
      };
    }
    const { operationKey, locale, providerTemplateId } = parsed.data;

    const existing = await prisma.applicationTemplateConfig.findFirst({
      where: { applicationId, operationKey, locale, providerAccountId: null },
      select: { id: true },
    });

    if (existing) {
      await prisma.applicationTemplateConfig.update({
        where: { id: existing.id },
        data: { providerTemplateId, active: true },
      });
    } else {
      await prisma.applicationTemplateConfig.create({
        data: { organizationId: org.id, applicationId, operationKey, locale, providerTemplateId, active: true },
      });
    }

    revalidatePath(PAGE_PATH);
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function toggleTemplateConfig(id: string, active: boolean) {
  try {
    const { org } = await requireOrganizationManager();
    const updated = await prisma.applicationTemplateConfig.updateMany({
      where: { id, organizationId: org.id },
      data: { active },
    });
    if (updated.count === 0) return { error: "Configuration de template introuvable." };

    revalidatePath(PAGE_PATH);
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}
