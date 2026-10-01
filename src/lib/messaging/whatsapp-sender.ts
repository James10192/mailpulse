// Which WhatsApp identity a message leaves from.
//
// An application owns its number: the ProviderAccount whose applicationId is
// the application's, the same account the signed-command rail already sends
// through. An API key attached to the application therefore sends from that
// number, and rotating the key changes nothing. A message with no application,
// or an application that never had a number, leaves from the organization's
// own number, as every message did before applications carried one.
//
// There is no fallback between numbers: an application whose number is
// disabled or ambiguous gets `unavailable`, never another brand's number.

import { consentWhere } from "@/lib/external-applications/consent-store";
import { decryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import { prisma } from "@/lib/prisma";
import type { WhatsAppProviderConfig } from "@/lib/whatsapp/types";
import { directProvider, type WhatsAppProviderMode } from "@/lib/mailpulse/direct-provider";

export const META_WHATSAPP_PROVIDER = "META_WHATSAPP";
export const BAILEYS_WHATSAPP_PROVIDER = "BAILEYS_WHATSAPP";

export const SENDER_UNAVAILABLE_CODE = "sender_unavailable";
export const SENDER_UNAVAILABLE_MESSAGE = "Le numéro WhatsApp de cette application est indisponible.";
export const CONSENT_REFUSED_CODE = "consent_refused";
export const CONSENT_REFUSED_MESSAGE = "Le destinataire a refusé les messages de ce numéro.";

export type WhatsAppSenderAccount = {
  id: string;
  provider: string;
  active: boolean;
  label: string | null;
  senderId: string | null;
  externalAccountId: string;
  credentialsCiphertext: string | null;
};

export type WhatsAppSender =
  | { kind: "organization" }
  | { kind: "account"; account: WhatsAppSenderAccount }
  | { kind: "unavailable" };

/** What a screen says about where an application's WhatsApp messages leave from. */
export type WhatsAppSenderSummary =
  | { state: "own"; label: string }
  | { state: "organization" }
  | { state: "unavailable"; reason: "disabled" | "ambiguous" };

/** Identity frozen on a message when it is created. */
export type SenderSnapshot = {
  source: "organization" | "application";
  provider: string;
  label: string | null;
  address: string | null;
};

/**
 * Every WhatsApp account the application ever had, active or not: a disabled
 * one still binds the application, so its messages are refused rather than
 * sent from the organization's number.
 */
export function chooseWhatsAppSender(applicationAccounts: WhatsAppSenderAccount[]): WhatsAppSender {
  if (applicationAccounts.length === 0) return { kind: "organization" };
  const active = applicationAccounts.filter((account) => account.active);
  return active.length === 1 ? { kind: "account", account: active[0] } : { kind: "unavailable" };
}

export function summarizeWhatsAppSender(applicationAccounts: WhatsAppSenderAccount[]): WhatsAppSenderSummary {
  const sender = chooseWhatsAppSender(applicationAccounts);
  if (sender.kind === "organization") return { state: "organization" };
  if (sender.kind === "account") {
    const { account } = sender;
    // Shown to every member: a number without a name is masked, never printed whole.
    return { state: "own", label: account.label ?? maskedAddress(account.senderId) ?? account.externalAccountId };
  }
  return {
    state: "unavailable",
    reason: applicationAccounts.some((account) => account.active) ? "ambiguous" : "disabled",
  };
}

/** The application's WhatsApp accounts, active or not, as chooseWhatsAppSender reads them. */
export const APPLICATION_WHATSAPP_ACCOUNTS = {
  where: { channel: "WHATSAPP" as const, provider: { in: [META_WHATSAPP_PROVIDER, BAILEYS_WHATSAPP_PROVIDER] } },
  select: {
    id: true,
    provider: true,
    active: true,
    label: true,
    senderId: true,
    externalAccountId: true,
    credentialsCiphertext: true,
  } as const,
};

export async function resolveWhatsAppSender(organizationId: string, applicationId: string | null): Promise<WhatsAppSender> {
  if (!applicationId) return { kind: "organization" };
  const accounts = await prisma.providerAccount.findMany({
    where: { organizationId, applicationId, ...APPLICATION_WHATSAPP_ACCOUNTS.where },
    select: APPLICATION_WHATSAPP_ACCOUNTS.select,
  });
  return chooseWhatsAppSender(accounts);
}

/**
 * A NON or STOP sent to an application's number binds every message from that
 * number, whichever rail asks: the signed commands refuse it, so must the API.
 * Scoped like the commands' consent: application, number, recipient.
 */
export async function recipientRefusedApplicationNumber(scope: {
  organizationId: string;
  applicationId: string;
  providerAccountId: string;
  recipient: string;
}) {
  const consent = await prisma.externalRecipientConsent.findUnique({
    where: { organizationId_applicationId_providerAccountId_recipientHash: consentWhere(scope) },
    select: { status: true },
  });
  return consent?.status === "REFUSED";
}

/** The account a message was created for, scoped to its organization. */
export function findSenderAccount(organizationId: string, accountId: string): Promise<WhatsAppSenderAccount | null> {
  return prisma.providerAccount.findFirst({
    where: { organizationId, id: accountId, channel: "WHATSAPP" },
    select: APPLICATION_WHATSAPP_ACCOUNTS.select,
  });
}

export function accountMode(account: Pick<WhatsAppSenderAccount, "provider">): WhatsAppProviderMode {
  return account.provider === META_WHATSAPP_PROVIDER ? "META" : "BAILEYS";
}

/** Null when the account cannot send: disabled, or missing what its transport needs. */
export function providerConfigForAccount(account: WhatsAppSenderAccount): WhatsAppProviderConfig | null {
  if (!account.active) return null;
  if (account.provider === BAILEYS_WHATSAPP_PROVIDER) {
    return account.externalAccountId ? { mode: "BAILEYS", instanceName: account.externalAccountId } : null;
  }
  if (account.provider !== META_WHATSAPP_PROVIDER || !account.senderId || !account.credentialsCiphertext) return null;
  const accessToken = readMetaAccessToken(account.credentialsCiphertext);
  return accessToken ? { mode: "META", phoneNumberId: account.senderId, accessToken } : null;
}

export function accountSnapshot(account: WhatsAppSenderAccount): SenderSnapshot {
  return {
    source: "application",
    provider: directProvider("WHATSAPP", accountMode(account)),
    label: account.label,
    address: account.senderId,
  };
}

export function organizationSnapshot(organization: { whatsappMode: WhatsAppProviderMode; whatsappPhone: string | null }): SenderSnapshot {
  return {
    source: "organization",
    provider: directProvider("WHATSAPP", organization.whatsappMode),
    label: null,
    address: organization.whatsappPhone,
  };
}

/**
 * What a new message records about its WhatsApp identity. Dispatch, a replay
 * and the history all read it from the message, never from the application's
 * number as it is later. `sender` is null for the other channels.
 */
export function messageRouting(
  sender: WhatsAppSender | null,
  organization: { whatsappMode: WhatsAppProviderMode; whatsappPhone: string | null } | undefined,
) {
  if (sender?.kind === "account") {
    return {
      refused: false,
      mode: accountMode(sender.account),
      senderAccountId: sender.account.id,
      senderSnapshot: accountSnapshot(sender.account),
    };
  }
  return {
    refused: sender?.kind === "unavailable",
    mode: organization?.whatsappMode ?? "META",
    senderAccountId: null,
    senderSnapshot: sender?.kind === "organization" && organization ? organizationSnapshot(organization) : null,
  };
}

/** Unreadable credentials (wrong key, damaged value) make the account unusable, not the request fail. */
function readMetaAccessToken(ciphertext: string) {
  try {
    const parsed: unknown = JSON.parse(decryptExternalApplicationValue(ciphertext));
    if (typeof parsed !== "object" || parsed === null || !("accessToken" in parsed)) return null;
    return typeof parsed.accessToken === "string" && parsed.accessToken ? parsed.accessToken : null;
  } catch {
    return null;
  }
}

function maskedAddress(address: string | null) {
  if (!address) return null;
  const digits = address.replace(/\D/g, "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : null;
}
