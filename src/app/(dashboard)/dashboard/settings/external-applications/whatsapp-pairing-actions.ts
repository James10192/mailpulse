"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { canAccessFeature, getFeatureUpgradeMessage, type PlanTier } from "@/lib/plans";
import { baileys } from "@/lib/whatsapp";
import { isPairingInstanceOf, ownerNumberOf, pairingInstanceName } from "@/lib/external-applications/whatsapp-pairing";
import {
  ActionGuardError,
  BAILEYS_PROVIDER,
  META_PROVIDER,
  requireApplication,
  requireOrganizationManager,
  toActionError,
} from "./guards";
import { pointInstanceAtApplication } from "./pairing-webhook";

const PAGE_PATH = "/dashboard/settings/external-applications";

async function requirePairingContext(applicationId: string) {
  const { org } = await requireOrganizationManager();
  if (!canAccessFeature(org.plan as PlanTier, "whatsapp")) throw new ActionGuardError(getFeatureUpgradeMessage("whatsapp"));
  if (!baileys.isConfigured()) throw new ActionGuardError("Le service WhatsApp n'est pas configuré sur cette instance.");
  const application = await requireApplication(org.id, applicationId);
  return { org, application };
}

function requireOwnInstance(instanceName: string, applicationId: string) {
  if (!isPairingInstanceOf(instanceName, applicationId)) throw new ActionGuardError("Cet appairage n'appartient pas à cette application.");
}

/**
 * Starts pairing a number to the application: a new Evolution instance named
 * after it, its webhook pointed at the application. Nothing changes for the
 * application until the QR code is scanned.
 */
export async function startApplicationWhatsAppPairing(applicationId: string): Promise<{ instanceName: string } | { error: string }> {
  try {
    const { org } = await requirePairingContext(applicationId);
    const metaActive = await prisma.providerAccount.count({
      where: { organizationId: org.id, applicationId, channel: "WHATSAPP", provider: META_PROVIDER, active: true },
    });
    if (metaActive > 0) {
      return { error: "Cette application envoie déjà par l'API officielle de Meta. Désactivez ce compte avant de connecter un numéro par QR code." };
    }

    const instanceName = pairingInstanceName(applicationId);
    await baileys.createInstance(instanceName);
    try {
      await pointInstanceAtApplication(instanceName, applicationId);
    } catch (error) {
      await baileys.deleteInstance(instanceName).catch(() => {});
      throw error;
    }
    return { instanceName };
  } catch (error) {
    return toActionError(error);
  }
}

export type PairingStatus =
  | { state: "connecting"; qr?: string; pairingCode?: string }
  | { state: "open"; senderId: string | null }
  | { error: string };

/**
 * Polled while the QR code is on screen. Once the phone has scanned it, the
 * instance becomes the application's sending number: it replaces the previous
 * one, which is then logged out if MailPulse created it.
 */
export async function pollApplicationWhatsAppPairing(applicationId: string, instanceName: string): Promise<PairingStatus> {
  try {
    const { org } = await requirePairingContext(applicationId);
    requireOwnInstance(instanceName, applicationId);

    const probe = await baileys.probeInstance(instanceName);
    if (probe.kind === "unreachable") return { error: "Le serveur WhatsApp ne répond pas pour le moment. Réessayez dans quelques instants." };
    if (probe.kind === "missing") return { error: "Cet appairage a expiré. Recommencez." };

    if (probe.state !== "open") {
      const qrData = await baileys.getQrCode(instanceName);
      return { state: "connecting", qr: qrData.base64 || qrData.qrcode?.base64 || undefined, pairingCode: qrData.pairingCode || undefined };
    }

    const senderId = ownerNumberOf((await baileys.fetchInstance(instanceName).catch(() => null)) ?? {});
    const previous = await prisma.$transaction(async (tx) => {
      const current = await tx.providerAccount.findFirst({
        where: { organizationId: org.id, applicationId, channel: "WHATSAPP", provider: BAILEYS_PROVIDER },
        orderBy: { updatedAt: "desc" },
        select: { id: true, externalAccountId: true },
      });
      if (current) {
        // Same account, new instance: its name and history stay, messages
        // already sent keep the snapshot taken when they were created.
        await tx.providerAccount.update({
          where: { id: current.id },
          data: { externalAccountId: instanceName, senderId, active: true },
        });
        return current.externalAccountId;
      }
      await tx.providerAccount.create({
        data: {
          organizationId: org.id,
          applicationId,
          channel: "WHATSAPP",
          provider: BAILEYS_PROVIDER,
          externalAccountId: instanceName,
          senderId,
          credentialsCiphertext: null,
          active: true,
        },
      });
      return null;
    });

    // Only an instance MailPulse created for this application is retired: one
    // linked by hand may serve something else.
    if (previous && previous !== instanceName && isPairingInstanceOf(previous, applicationId)) {
      await baileys.logoutInstance(previous).catch(() => {});
      await baileys.deleteInstance(previous).catch(() => {});
    }

    revalidatePath(PAGE_PATH);
    return { state: "open", senderId };
  } catch (error) {
    return toActionError(error);
  }
}

/** Abandons a pairing that was not finished: its instance is removed from Evolution. */
export async function cancelApplicationWhatsAppPairing(applicationId: string, instanceName: string) {
  try {
    const { org } = await requirePairingContext(applicationId);
    requireOwnInstance(instanceName, applicationId);
    const inUse = await prisma.providerAccount.count({
      where: { organizationId: org.id, channel: "WHATSAPP", provider: BAILEYS_PROVIDER, externalAccountId: instanceName },
    });
    // Already the application's number: the pairing finished, nothing to undo.
    if (inUse > 0) return { success: true };
    await baileys.logoutInstance(instanceName).catch(() => {});
    await baileys.deleteInstance(instanceName).catch(() => {});
    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}
