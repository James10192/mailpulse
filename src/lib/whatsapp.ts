// Unified WhatsApp client — routes to Baileys (Evolution API) or Meta Cloud API
// based on the organization's whatsappMode setting.

import * as baileys from "@/lib/whatsapp-baileys";
import * as meta from "@/lib/whatsapp-meta";

export type WhatsAppMode = "BAILEYS" | "META";

interface OrgWhatsAppConfig {
  whatsappEnabled: boolean;
  whatsappMode: WhatsAppMode;
  whatsappPhone: string | null;
  // Baileys
  evoInstanceName: string | null;
  evoInstanceStatus: string | null;
  // Meta
  metaWabaId: string | null;
  metaPhoneNumberId: string | null;
  metaAccessToken: string | null;
}

export async function sendWhatsApp(
  org: OrgWhatsAppConfig,
  to: string,
  text: string,
) {
  if (!org.whatsappEnabled) {
    throw new Error("WhatsApp non active pour cette organisation.");
  }

  if (org.whatsappMode === "META") {
    return meta.sendText(org, to, text);
  }

  // Baileys via Evolution API
  if (!org.evoInstanceName) {
    throw new Error("Instance WhatsApp non configuree. Scannez le QR code.");
  }
  return baileys.sendText(org.evoInstanceName, to, text);
}

export async function getConnectionStatus(org: OrgWhatsAppConfig) {
  if (org.whatsappMode === "META") {
    return {
      connected: meta.isMetaConfigured(org),
      mode: "META" as const,
      phone: org.whatsappPhone,
    };
  }

  if (!org.evoInstanceName) {
    return { connected: false, mode: "BAILEYS" as const, phone: null };
  }

  try {
    const state = await baileys.getConnectionState(org.evoInstanceName);
    return {
      connected: state.state === "open",
      mode: "BAILEYS" as const,
      phone: org.whatsappPhone,
      state: state.state,
    };
  } catch {
    return { connected: false, mode: "BAILEYS" as const, phone: org.whatsappPhone };
  }
}

export function isAnyProviderConfigured() {
  return baileys.isConfigured(); // Meta doesn't need platform-level config
}

export { baileys, meta };
