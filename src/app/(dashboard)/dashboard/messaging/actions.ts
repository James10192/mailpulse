"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkContactLimit, type PlanTier } from "@/lib/plans";
import { baileys } from "@/lib/whatsapp";
import type { WhatsAppMode } from "@/lib/whatsapp";
import type { ActionState } from "@/types/action-state";
import { normalizeContactPhone } from "@/lib/phone-numbers";
import { createCommunicationMessage } from "@/lib/mailpulse/messages";

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

function freshInstanceName(orgId: string) {
  const safeOrgId = orgId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24);
  return `mp-${safeOrgId}-${Date.now().toString(36)}`;
}

async function createFreshBaileysInstance(orgId: string, previousInstanceName?: string | null) {
  if (previousInstanceName) {
    await baileys.logoutInstance(previousInstanceName).catch(() => {});
    await baileys.deleteInstance(previousInstanceName).catch(() => {});
  }

  const instanceName = freshInstanceName(orgId);
  await baileys.createInstance(instanceName);

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      whatsappEnabled: true,
      whatsappMode: "BAILEYS",
      evoInstanceName: instanceName,
      evoInstanceStatus: "connecting",
      whatsappPhone: null,
    },
  });

  return instanceName;
}

function getQrImage(qrData: Awaited<ReturnType<typeof baileys.getQrCode>>) {
  return qrData.base64 || qrData.qrcode?.base64 || undefined;
}

function getContactDisplayName(contact: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ") || contact.email;
}

// ─── Activation (Baileys) ───────────────────────────────

export async function activateBaileys(): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  if (!baileys.isConfigured()) {
    return { error: "Le service WhatsApp n'est pas configuré sur cette instance." };
  }

  try {
    const orgWa = await getOrgWhatsApp(org.id);
    await createFreshBaileysInstance(org.id, orgWa?.evoInstanceName);

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
  if (!user || !org) return { error: "Non authentifié." };

  const orgWa = await getOrgWhatsApp(org.id);
  if (!orgWa?.evoInstanceName) return { error: "Instance non créée." };

  try {
    // Check if already connected
    let state: { state: string };
    try {
      state = await baileys.getConnectionState(orgWa.evoInstanceName);
    } catch {
      // Instance doesn't exist on server (e.g. after server migration) — recreate it
      await createFreshBaileysInstance(org.id, orgWa.evoInstanceName);
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
      qr: getQrImage(qrData),
      pairingCode: qrData.pairingCode || undefined,
      state: "connecting",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur QR code";
    return { error: msg };
  }
}

// ─── Check Status ───────────────────────────────────────

export async function resetBaileysConnection(): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  if (!baileys.isConfigured()) {
    return { error: "Le service WhatsApp n'est pas configuré sur cette instance." };
  }

  const orgWa = await getOrgWhatsApp(org.id);

  try {
    await createFreshBaileysInstance(org.id, orgWa?.evoInstanceName);
    revalidatePath("/dashboard/messaging");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur de réinitialisation WhatsApp";
    return { error: msg };
  }
}

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

export async function createMessagingContact(input: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;
}): Promise<ActionState & {
  contact?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    phone: string;
    name: string;
  };
}> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  const phone = normalizeContactPhone(input.phone);
  if (!phone) return { error: "Numéro WhatsApp requis." };

  const existing = await prisma.contact.findFirst({
    where: { organizationId: org.id, phone },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
    },
  });

  if (existing) {
    return {
      success: true,
      contact: {
        ...existing,
        phone: existing.phone ?? phone,
        name: getContactDisplayName(existing),
      },
    };
  }

  const contactCheck = await checkContactLimit(org.id, org.plan as PlanTier);
  if (!contactCheck.allowed) {
    return { error: `Limite de contacts atteinte (${contactCheck.limit}). Passez au plan Pro pour plus de contacts.` };
  }

  const email = input.email?.trim().toLowerCase() || `wa-${phone.replace(/\D/g, "")}@contacts.mailpulse.local`;

  try {
    const contact = await prisma.contact.create({
      data: {
        email,
        firstName: input.firstName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        phone,
        source: "whatsapp",
        userId: user.id,
        organizationId: org.id,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
      },
    });

    revalidatePath("/dashboard/messaging");
    revalidatePath("/dashboard/contacts");
    revalidatePath("/dashboard");

    return {
      success: true,
      contact: {
        ...contact,
        phone: contact.phone ?? phone,
        name: getContactDisplayName(contact),
      },
    };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      return { error: "Un contact utilise déjà cet email dans votre organisation." };
    }
    return { error: "Erreur lors de la création du contact WhatsApp." };
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
      whatsappPhone: normalizeContactPhone(phone) || null,
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

  const phone = normalizeContactPhone(to);
  if (!phone) return { error: "Le numero WhatsApp est invalide." };

  try {
    const message = await createCommunicationMessage({
      organizationId: org.id,
      origin: "PLATFORM",
      organization: orgWa,
      input: {
        channel: "whatsapp",
        recipient: { type: "phone", value: phone },
        content: { type: "text", text: body },
      },
    });

    revalidatePath("/dashboard/messaging");
    revalidatePath("/dashboard/platform");
    return message.status === "failed" || message.status === "template_required"
      ? { error: message.error_message ?? "Échec de l’envoi WhatsApp." }
      : { success: true };
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
      phone: { not: null },
      ...(audience !== "all" ? { tags: { some: { name: audience } } } : {}),
    },
    select: { id: true, phone: true, firstName: true, lastName: true },
  });

  if (withPhone.length === 0) {
    return { error: "Aucun contact avec un numero WhatsApp." };
  }

  let sent = 0;

  for (const contact of withPhone) {
    try {
      const personalized = body
        .replace(/\{\{firstName\}\}/g, contact.firstName || "")
        .replace(/\{\{lastName\}\}/g, contact.lastName || "");

      const message = await createCommunicationMessage({
        organizationId: org.id,
        origin: "PLATFORM",
        organization: orgWa,
        input: {
          channel: "whatsapp",
          recipient: { type: "phone", value: contact.phone! },
          content: { type: "text", text: personalized },
        },
      });
      if (message.status !== "failed" && message.status !== "template_required") sent++;

      // Small delay between messages to avoid rate limiting
      if (sent < withPhone.length) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch {
      // Continue sending to other contacts
    }
  }

  if (sent === 0) {
    return { error: "Échec d’envoi à tous les contacts." };
  }

  revalidatePath("/dashboard/messaging");
  revalidatePath("/dashboard/platform");
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
