import { directProvider } from "@/lib/mailpulse/direct-provider";
import { baileys, sendWhatsApp, type WhatsAppMode } from "@/lib/whatsapp";
import type { VerificationTransport } from "./types";

export type OrganizationWhatsApp = {
  whatsappEnabled: boolean;
  whatsappMode: WhatsAppMode;
  whatsappPhone: string | null;
  evoInstanceName: string | null;
  evoInstanceStatus: string | null;
  metaWabaId: string | null;
  metaPhoneNumberId: string | null;
  metaAccessToken: string | null;
};

/**
 * Whether the organization can send a WhatsApp text right now, judged from its
 * stored configuration only: no provider call, so a refusal costs nothing and
 * never reaches the recipient.
 */
export function isWhatsAppOperational(org: OrganizationWhatsApp) {
  if (!org.whatsappEnabled) return false;
  if (org.whatsappMode === "META") return Boolean(org.metaPhoneNumberId && org.metaAccessToken);
  return Boolean(org.evoInstanceName && org.evoInstanceStatus === "open" && baileys.isConfigured());
}

/** Sends through the organization's configured provider, with the usual number fallbacks. */
export function whatsAppVerificationTransport(org: OrganizationWhatsApp): VerificationTransport {
  const provider = directProvider("WHATSAPP", org.whatsappMode);
  return {
    async send(to, text) {
      try {
        const result = await sendWhatsApp(org, to, text);
        return { ok: true, provider, providerMessageId: result.messageId ?? null };
      } catch (error) {
        return { ok: false, provider, error: error instanceof Error ? error.message : "Échec de l'envoi WhatsApp." };
      }
    },
  };
}
