"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { sendWhatsApp, baileys } from "@/lib/whatsapp";
import type { WhatsAppMode } from "@/lib/whatsapp";
import type { ActionState } from "@/types/action-state";

// ─── Helpers ────────────────────────────────────────────

async function getOrgWhatsApp(orgId: string) {
  return prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      whatsappEnabled: true,
      whatsappMode: true,
      whatsappPhone: true,
      evoInstanceName: true,
      evoInstanceStatus: true,
      metaWabaId: true,
      metaPhoneNumberId: true,
      metaAccessToken: true,
    },
  });
}

// ─── Activation (Baileys) ───────────────────────────────

export async function activateBaileys(): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  if (!baileys.isConfigured()) {
    return { error: "Le service WhatsApp n'est pas configure sur cette instance." };
  }

  try {
    // Create unique instance name from org ID
    const instanceName = `mp-${org.id}`;

    // Create Evolution API instance
    const result = await baileys.createInstance(instanceName);

    // Save to org
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        whatsappEnabled: true,
        whatsappMode: "BAILEYS",
        evoInstanceName: instanceName,
        evoInstanceStatus: "connecting",
      },
    });

    revalidatePath("/dashboard/messaging");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur d'activation";
    return { error: msg };
  }
}

// ─── QR Code ────────────────────────────────────────────

export async function getQrCode(): Promise<{
  qr?: string;
  pairingCode?: string;
  state?: string;
  error?: string;
}> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const orgWa = await getOrgWhatsApp(org.id);
  if (!orgWa?.evoInstanceName) return { error: "Instance non creee." };

  try {
    // Check if already connected
    let state: { state: string };
    try {
      state = await baileys.getConnectionState(orgWa.evoInstanceName);
    } catch {
      // Instance doesn't exist on server (e.g. after server migration) — recreate it
      await baileys.createInstance(orgWa.evoInstanceName);
      return { state: "reconnecting" };
    }

    if (state.state === "open") {
      if (orgWa.evoInstanceStatus !== "open") {
        await prisma.organization.update({
          where: { id: org.id },
          data: { evoInstanceStatus: "open" },
        });
      }
      return { state: "open" };
    }

    // Get QR code
    const qrData = await baileys.getQrCode(orgWa.evoInstanceName);
    return {
      qr: qrData.base64 || qrData.code || undefined,
      pairingCode: qrData.pairingCode || undefined,
      state: "connecting",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur QR code";
    return { error: msg };
  }
}

// ─── Check Status ───────────────────────────────────────

export async function checkConnectionStatus(): Promise<{
  state: string;
  phone?: string;
  error?: string;
}> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { state: "error", error: "Non authentifie." };

  const orgWa = await getOrgWhatsApp(org.id);
  if (!orgWa?.evoInstanceName) return { state: "none" };

  try {
    const result = await baileys.getConnectionState(orgWa.evoInstanceName);

    // Update DB status
    if (result.state !== orgWa.evoInstanceStatus) {
      await prisma.organization.update({
        where: { id: org.id },
        data: { evoInstanceStatus: result.state },
      });
      revalidatePath("/dashboard/messaging");
    }

    return { state: result.state, phone: orgWa.whatsappPhone || undefined };
  } catch {
    return { state: "error" };
  }
}

// ─── Save Meta Cloud API Config ─────────────────────────

export async function saveMetaConfig(
  wabaId: string,
  phoneNumberId: string,
  accessToken: string,
  phone: string,
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  if (!wabaId || !phoneNumberId || !accessToken) {
    return { error: "Tous les champs sont requis." };
  }

  await prisma.organization.update({
    where: { id: org.id },
    data: {
      whatsappEnabled: true,
      whatsappMode: "META",
      metaWabaId: wabaId,
      metaPhoneNumberId: phoneNumberId,
      metaAccessToken: accessToken,
      whatsappPhone: phone || null,
    },
  });

  revalidatePath("/dashboard/messaging");
  return { success: true };
}

// ─── Switch Mode ────────────────────────────────────────

export async function switchWhatsAppMode(mode: WhatsAppMode): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  await prisma.organization.update({
    where: { id: org.id },
    data: { whatsappMode: mode },
  });

  revalidatePath("/dashboard/messaging");
  return { success: true };
}

// ─── Send Single Message ────────────────────────────────

export async function sendMessage(to: string, body: string): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const orgWa = await getOrgWhatsApp(org.id);
  if (!orgWa?.whatsappEnabled) return { error: "WhatsApp non active." };

  if (!to || !body) return { error: "Numero et message requis." };

  const phone = to.replace(/\s/g, "");
  if (!phone.startsWith("+")) return { error: "Le numero doit commencer par + (ex: +225XXXXXXXXX)." };

  try {
    await sendWhatsApp(orgWa, phone, body);
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur d'envoi";
    return { error: msg };
  }
}

// ─── Send Bulk Messages ─────────────────────────────────

export async function sendBulkMessages(
  body: string,
  audience: "all" | string,
): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const orgWa = await getOrgWhatsApp(org.id);
  if (!orgWa?.whatsappEnabled) return { error: "WhatsApp non active." };
  if (!body) return { error: "Le message est requis." };

  const withPhone = await prisma.contact.findMany({
    where: {
      organizationId: org.id,
      subscribed: true,
      phone: { startsWith: "+" },
      ...(audience !== "all" ? { tags: { some: { name: audience } } } : {}),
    },
    select: { id: true, phone: true, firstName: true, lastName: true },
  });

  if (withPhone.length === 0) {
    return { error: "Aucun contact avec un numero de telephone valide (+XXX)." };
  }

  let sent = 0;

  for (const contact of withPhone) {
    try {
      const personalized = body
        .replace(/\{\{firstName\}\}/g, contact.firstName || "")
        .replace(/\{\{lastName\}\}/g, contact.lastName || "");

      await sendWhatsApp(orgWa, contact.phone!, personalized);
      sent++;

      // Small delay between messages to avoid rate limiting
      if (sent < withPhone.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch {
      // Continue sending to other contacts
    }
  }

  if (sent === 0) {
    return { error: "Echec d'envoi a tous les contacts." };
  }

  return { success: true };
}

// ─── Disconnect / Reset ─────────────────────────────────

export async function disconnectWhatsApp(): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const orgWa = await getOrgWhatsApp(org.id);

  try {
    if (orgWa?.evoInstanceName) {
      await baileys.logoutInstance(orgWa.evoInstanceName).catch(() => {});
      await baileys.deleteInstance(orgWa.evoInstanceName).catch(() => {});
    }

    await prisma.organization.update({
      where: { id: org.id },
      data: {
        whatsappEnabled: false,
        evoInstanceName: null,
        evoInstanceStatus: null,
        whatsappPhone: null,
        metaWabaId: null,
        metaPhoneNumberId: null,
        metaAccessToken: null,
      },
    });

    revalidatePath("/dashboard/messaging");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur de deconnexion";
    return { error: msg };
  }
}
