import { directProvider } from "@/lib/mailpulse/direct-provider";
import { accountMode, providerConfigForAccount, resolveWhatsAppSender } from "@/lib/messaging/whatsapp-sender";
import { baileys, sendWhatsApp, sendWhatsAppWith, type WhatsAppMode } from "@/lib/whatsapp";

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
  /** The application number the code leaves from; null for the organization's own. */
  readonly senderAccountId: string | null;
  send(to: string, text: string): Promise<{ messageId: string | null }>;
}

/**
 * Whether the organization can deliver a code right now, judged from its stored
 * configuration only: no provider call, so a refusal costs nothing and never
 * reaches the recipient.
 *
 * WhatsApp Cloud API is refused: outside the 24-hour window opened by the user,
 * Meta accepts a free-text message and then never delivers it. Codes need an
 * approved authentication template there, which verifications do not support
 * yet, so a Meta organization gets an explicit refusal rather than a code that
 * silently never arrives.
 */
export function canSendVerificationCodes(org: OrganizationWhatsApp) {
  if (!org.whatsappEnabled || org.whatsappMode !== "BAILEYS") return false;
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
    senderAccountId: null,
    async send(to, text) {
      const result = await sendWhatsApp(org, to, text, { fallbacks: false, priority: "interactive" });
      return { messageId: result.messageId ?? null };
    },
  };
}

/**
 * The transport for a key: its application's number when the application has
 * one, the organization's otherwise. Null when no code can leave: a disabled or
 * ambiguous application number is refused, never replaced by the
 * organization's, and only a WhatsApp Web (Baileys) number can carry a code.
 */
export async function verificationTransportFor(
  organizationId: string,
  applicationId: string | null,
  org: OrganizationWhatsApp,
): Promise<VerificationTransport | null> {
  const sender = await resolveWhatsAppSender(organizationId, applicationId);
  if (sender.kind === "organization") return canSendVerificationCodes(org) ? whatsAppVerificationTransport(org) : null;
  if (sender.kind === "unavailable") return null;

  const config = providerConfigForAccount(sender.account);
  if (!config || config.mode !== "BAILEYS" || !baileys.isConfigured()) return null;
  return {
    provider: directProvider("WHATSAPP", accountMode(sender.account)),
    senderAccountId: sender.account.id,
    async send(to, text) {
      const result = await sendWhatsAppWith(config, to, text, { fallbacks: false, priority: "interactive" });
      return { messageId: result.messageId ?? null };
    },
  };
}
