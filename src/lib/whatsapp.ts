// Unified WhatsApp client — routes to Baileys (Evolution API) or Meta Cloud API
// based on the organization's whatsappMode setting.

import type { IWhatsAppProvider, WhatsAppProviderConfig } from "@/lib/whatsapp/types";
import { BaileysProvider } from "@/lib/whatsapp-baileys";
import { MetaProvider } from "@/lib/whatsapp-meta";
import * as baileys from "@/lib/whatsapp-baileys";
import * as meta from "@/lib/whatsapp-meta";
import { getWhatsAppPhoneCandidates } from "@/lib/phone-numbers";

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

function createProvider(config: WhatsAppProviderConfig): IWhatsAppProvider {
  switch (config.mode) {
    case "BAILEYS":
      return new BaileysProvider(config.instanceName);
    case "META":
      return new MetaProvider(config.phoneNumberId, config.accessToken);
  }
}

function resolveProviderConfig(org: OrgWhatsAppConfig): WhatsAppProviderConfig {
  if (org.whatsappMode === "META") {
    if (!org.metaPhoneNumberId || !org.metaAccessToken) {
      throw new Error("Meta Cloud API non configure pour cette organisation.");
    }
    return {
      mode: "META",
      phoneNumberId: org.metaPhoneNumberId,
      accessToken: org.metaAccessToken,
    };
  }

  if (!org.evoInstanceName) {
    throw new Error("Instance WhatsApp non configuree. Scannez le QR code.");
  }
  return { mode: "BAILEYS", instanceName: org.evoInstanceName };
}

export async function sendWhatsApp(
  org: OrgWhatsAppConfig,
  to: string,
  text: string,
) {
  if (!org.whatsappEnabled) {
    throw new Error("WhatsApp non active pour cette organisation.");
  }

  const config = resolveProviderConfig(org);
  const provider = createProvider(config);
  const candidates = getWhatsAppPhoneCandidates(to);
  let result = await provider.sendText(candidates[0] ?? to, text);

  for (const candidate of candidates.slice(1)) {
    if (result.success) break;
    result = await provider.sendText(candidate, text);
  }

  if (!result.success) {
    throw new Error(result.error ?? "Echec de l'envoi WhatsApp.");
  }

  return result;
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
