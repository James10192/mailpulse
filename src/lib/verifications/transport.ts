import { directProvider } from "@/lib/mailpulse/direct-provider";
import {
  accountMode,
  APPLICATION_WHATSAPP_ACCOUNTS,
  BAILEYS_WHATSAPP_PROVIDER,
  providerConfigForAccount,
  resolveWhatsAppSender,
  type WhatsAppSenderAccount,
} from "@/lib/messaging/whatsapp-sender";
import { prisma } from "@/lib/prisma";
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
  /** When that number was paired by QR code, which decides its rate. */
  readonly senderPairedAt: Date | null;
  /** The digits of that number, for a wa.me link; null when unknown. */
  readonly senderNumber: string | null;
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
    senderPairedAt: null,
    senderNumber: null,
    async send(to, text) {
      const result = await sendWhatsApp(org, to, text, { fallbacks: false, priority: "interactive" });
      return { messageId: result.messageId ?? null };
    },
  };
}

/**
 * The transport for a key: the number it names, else its application's
 * default, else the organization's when the application has no number. Only a
 * WhatsApp Web (Baileys) number can carry a code, so with no number named, an
 * application whose default cannot (Meta) uses another of its own active
 * numbers that can. Never another application's, never the organization's in
 * place of the application's.
 */
export async function verificationTransportFor(
  organizationId: string,
  applicationId: string | null,
  org: OrganizationWhatsApp,
  requestedId?: string | null,
): Promise<VerificationTransport | null> {
  const sender = await resolveWhatsAppSender(organizationId, applicationId, requestedId);
  if (sender.kind === "organization") return canSendVerificationCodes(org) ? whatsAppVerificationTransport(org) : null;
  if (sender.kind === "unavailable") return null;

  const carrier = transportForAccount(sender.account)
    ?? (requestedId || !applicationId ? null : await otherCodeCarrier(organizationId, applicationId, sender.account.id));
  return carrier;
}

function transportForAccount(account: WhatsAppSenderAccount): VerificationTransport | null {
  const config = providerConfigForAccount(account);
  if (!config || config.mode !== "BAILEYS" || !baileys.isConfigured()) return null;
  return {
    provider: directProvider("WHATSAPP", accountMode(account)),
    senderAccountId: account.id,
    senderPairedAt: account.pairedAt ?? null,
    senderNumber: account.senderId?.replace(/\D/g, "") || null,
    async send(to, text) {
      const result = await sendWhatsAppWith(config, to, text, { fallbacks: false, priority: "interactive" });
      return { messageId: result.messageId ?? null };
    },
  };
}

async function otherCodeCarrier(organizationId: string, applicationId: string, excludeId: string) {
  const accounts = await prisma.providerAccount.findMany({
    where: {
      organizationId,
      applicationId,
      ...APPLICATION_WHATSAPP_ACCOUNTS.where,
      active: true,
      provider: BAILEYS_WHATSAPP_PROVIDER,
      NOT: { id: excludeId },
    },
    orderBy: { createdAt: "asc" },
    select: APPLICATION_WHATSAPP_ACCOUNTS.select,
  });
  for (const account of accounts) {
    const transport = transportForAccount(account);
    if (transport) return transport;
  }
  return null;
}
