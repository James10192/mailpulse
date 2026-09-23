import { directProvider } from "../mailpulse/direct-provider";
import { baileys, sendWhatsApp, type WhatsAppMode } from "../whatsapp";

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

/** Sends a code; resolves with the provider message id or throws. */
export interface VerificationTransport {
  readonly provider: string;
  send(to: string, text: string): Promise<{ messageId: string | null }>;
}

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

/**
 * The organization's provider, restricted to the exact number: the legacy
 * number variants other sends fall back to would deliver the code to whoever
 * owns that other number.
 */
export function whatsAppVerificationTransport(org: OrganizationWhatsApp): VerificationTransport {
  return {
    provider: directProvider("WHATSAPP", org.whatsappMode),
    async send(to, text) {
      const result = await sendWhatsApp(org, to, text, { fallbacks: false });
      return { messageId: result.messageId ?? null };
    },
  };
}
