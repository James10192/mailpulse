import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { meta, sendWhatsApp } from "@/lib/whatsapp";
import { canReceiveChannel } from "./consent";
import { compileMetaTemplateDispatch } from "./template-parameters";

type CommunicationMessageWithTemplate = Prisma.CommunicationMessageGetPayload<{ include: { template: true } }>;
const DIRECT_DISPATCH_LEASE_MS = 5 * 60 * 1000;

export type MailPulseMessageOrganization = {
  whatsappEnabled: boolean;
  whatsappMode: "BAILEYS" | "META";
  whatsappPhone: string | null;
  evoInstanceName: string | null;
  evoInstanceStatus: string | null;
  metaWabaId: string | null;
  metaPhoneNumberId: string | null;
  metaAccessToken: string | null;
};

export async function dispatchQueuedMessage(
  messageId: string,
  options: {
    organization?: MailPulseMessageOrganization;
    defaultEmailSenderId?: string | null;
  } = {},
) {
  const message = await prisma.communicationMessage.findUnique({
    where: { id: messageId },
    include: { template: true },
  });
  if (!message) throw new Error("Message introuvable apres creation.");
  if (!["QUEUED", "PROCESSING"].includes(message.status) || message.channel === "SMS") return message;

  const claimedMessage = await claimDirectDispatch(message.id, new Date());
  if (!claimedMessage) {
    return prisma.communicationMessage.findUniqueOrThrow({
      where: { id: message.id },
      include: { template: true },
    });
  }

  if (claimedMessage.channel === "EMAIL") {
    if (!canReceiveChannel(await findMessageContact(claimedMessage.contactId), "EMAIL")) {
      return markMessageFailed(claimedMessage.id, "consent_denied", "Le destinataire a refuse les emails.", claimedMessage.processingToken);
    }
    return dispatchEmailMessage(claimedMessage, options.defaultEmailSenderId ?? null);
  }

  if (claimedMessage.channel !== "WHATSAPP") return claimedMessage;
  if (!canReceiveChannel(await findMessageContact(claimedMessage.contactId), "WHATSAPP")) {
    return markMessageFailed(claimedMessage.id, "consent_denied", "Le destinataire a refuse les messages WhatsApp.", claimedMessage.processingToken);
  }
  if (!options.organization?.whatsappEnabled) {
    return markMessageFailed(
      claimedMessage.id,
      "channel_not_configured",
      "WhatsApp non configure pour cette organisation.",
      claimedMessage.processingToken,
    );
  }

  const preparedMessage = await markSubmissionPending(claimedMessage);
  if (!preparedMessage) return readMessage(claimedMessage.id);

  try {
    const result = preparedMessage.contentType === "TEMPLATE"
      ? await sendWhatsAppTemplate(options.organization, preparedMessage)
      : await sendWhatsApp(options.organization, preparedMessage.recipientValue, preparedMessage.text ?? "");

    return completeDirectDispatch(preparedMessage, {
      status: "SENT",
      sentAt: new Date(),
      providerMessageId: result.messageId ?? null,
      errorCode: null,
      errorMessage: null,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Echec de l'envoi WhatsApp.";
    return settleProviderFailure(preparedMessage, errorMessage);
  }
}

async function claimDirectDispatch(messageId: string, now: Date): Promise<CommunicationMessageWithTemplate | null> {
  const processingToken = randomUUID();
  const claim = await prisma.communicationMessage.updateMany({
    // PROCESSING is a pre-submission lease. Once the provider boundary is
    // crossed, the message becomes SUBMISSION_UNKNOWN and is never reclaimed.
    where: {
      id: messageId,
      OR: [
        { status: "QUEUED" },
        { status: "PROCESSING", processingStartedAt: { lt: leaseExpiry(now) } },
      ],
    },
    data: { status: "PROCESSING", processingStartedAt: now, processingToken },
  });
  if (claim.count === 0) return null;

  return prisma.communicationMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: { template: true },
  });
}

async function markSubmissionPending(message: CommunicationMessageWithTemplate) {
  const prepared = await prisma.communicationMessage.updateMany({
    where: { id: message.id, status: "PROCESSING", processingToken: message.processingToken },
    data: {
      status: "SUBMISSION_UNKNOWN",
      errorCode: "submission_pending",
      errorMessage: "Soumission fournisseur en cours de confirmation.",
    },
  });
  return prepared.count === 1 ? { ...message, status: "SUBMISSION_UNKNOWN" as const } : null;
}

async function completeDirectDispatch(
  message: CommunicationMessageWithTemplate,
  data: Prisma.CommunicationMessageUpdateManyMutationInput,
) {
  await prisma.communicationMessage.updateMany({
    where: { id: message.id, status: "SUBMISSION_UNKNOWN", processingToken: message.processingToken },
    data: { ...data, processingStartedAt: null, processingToken: null },
  });
  return prisma.communicationMessage.findUniqueOrThrow({ where: { id: message.id } });
}

async function dispatchEmailMessage(message: CommunicationMessageWithTemplate, defaultEmailSenderId: string | null) {
  let from: string;
  try {
    from = await resolveEmailFromAddress(message, defaultEmailSenderId);
  } catch (error) {
    return markMessageFailed(
      message.id,
      "provider_error",
      error instanceof Error ? error.message : "Echec de la preparation de l'envoi email.",
      message.processingToken,
    );
  }

  const preparedMessage = await markSubmissionPending(message);
  if (!preparedMessage) return readMessage(message.id);

  try {
    const result = await sendEmail({
      to: preparedMessage.recipientValue,
      from,
      subject: emailSubject(preparedMessage),
      html: emailHtml(preparedMessage),
      text: preparedMessage.text ?? "",
      tags: [
        { name: "message_id", value: preparedMessage.id },
        { name: "channel", value: "email" },
      ],
    });

    return completeDirectDispatch(preparedMessage, {
      status: "SENT",
      sentAt: new Date(),
      providerMessageId: result.id,
      errorCode: null,
      errorMessage: null,
    });
  } catch (error) {
    return settleProviderFailure(preparedMessage, error instanceof Error ? error.message : "Echec de l'envoi email.");
  }
}

async function resolveEmailFromAddress(message: CommunicationMessageWithTemplate, defaultEmailSenderId: string | null) {
  const requestedEmail = emailMetadataValue(message.metadata, "sender_email");
  const requestedName = emailMetadataValue(message.metadata, "sender_name") || "MailPulse";

  if (requestedEmail && await isVerifiedSenderEmail(message.organizationId, requestedEmail)) {
    return formatFromAddress(requestedName, requestedEmail);
  }

  const apiKeySender = defaultEmailSenderId
    ? await findVerifiedSenderById(message.organizationId, defaultEmailSenderId)
    : null;
  if (apiKeySender) return formatFromAddress(apiKeySender.name, apiKeySender.email);

  const sender = await findVerifiedSender(message.organizationId);
  if (sender) return formatFromAddress(sender.name, sender.email);

  const verifiedDomain = await prisma.sendingDomain.findFirst({
    where: { organizationId: message.organizationId, verified: true, status: "verified" },
    orderBy: { createdAt: "desc" },
    select: { domain: true },
  });
  if (verifiedDomain) return formatFromAddress(requestedName, `noreply@${verifiedDomain.domain}`);

  throw new Error("Aucun domaine expediteur verifie n'est configure pour cette organisation.");
}

async function isVerifiedSenderEmail(organizationId: string, email: string) {
  const domain = emailDomain(email);
  if (!domain) return false;

  const verifiedDomain = await prisma.sendingDomain.findFirst({
    where: { organizationId, domain, verified: true, status: "verified" },
    select: { id: true },
  });
  return Boolean(verifiedDomain);
}

async function findVerifiedSender(organizationId: string) {
  const senders = await prisma.emailSender.findMany({
    where: { organizationId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    select: { name: true, email: true },
  });

  for (const sender of senders) {
    if (await isVerifiedSenderEmail(organizationId, sender.email)) return sender;
  }
  return null;
}

async function findVerifiedSenderById(organizationId: string, senderId: string) {
  const sender = await prisma.emailSender.findFirst({
    where: { id: senderId, organizationId },
    select: { name: true, email: true },
  });
  if (!sender || !await isVerifiedSenderEmail(organizationId, sender.email)) return null;
  return sender;
}

async function sendWhatsAppTemplate(
  organization: MailPulseMessageOrganization,
  message: CommunicationMessageWithTemplate,
) {
  if (organization.whatsappMode === "META") {
    const dispatch = compileMetaTemplateDispatch(message.template ?? {
      providerTemplateId: null,
      variables: null,
      metadata: null,
    }, message.variables);
    const result = await meta.sendTemplate(
      organization,
      message.recipientValue,
      dispatch.providerTemplateId,
      message.locale ?? "fr",
      dispatch.parameters,
    );
    return { success: true, messageId: result.messages?.[0]?.id };
  }

  const body = renderTemplateBody(message.template?.body ?? "", message.variables);
  return sendWhatsApp(organization, message.recipientValue, body);
}

function emailDomain(email: string) {
  const [, domain] = email.toLowerCase().split("@");
  return domain || "";
}

function formatFromAddress(name: string, email: string) {
  return `${sanitizeFromName(name)} <${email.toLowerCase()}>`;
}

function sanitizeFromName(name: string) {
  return name.replace(/[<>\r\n"]/g, "").trim() || "MailPulse";
}

function renderTemplateBody(body: string, variables: unknown) {
  if (!variables || typeof variables !== "object" || Array.isArray(variables)) return body;
  return Object.entries(variables).reduce(
    (content, [key, value]) => content.replaceAll(`{{${key}}}`, String(value ?? "")),
    body,
  );
}

function emailHtml(message: CommunicationMessageWithTemplate) {
  return emailMetadataValue(message.metadata, "email_html") || textToHtml(message.text ?? "");
}

function emailSubject(message: CommunicationMessageWithTemplate) {
  const metadataSubject = emailMetadataValue(message.metadata, "subject");
  if (metadataSubject) return metadataSubject;

  const firstLine = (message.text ?? "").split(/\r?\n/).find((line) => line.trim() !== "");
  return firstLine?.trim().slice(0, 140) || "Message MailPulse";
}

function emailMetadataValue(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "";
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

function textToHtml(text: string) {
  return `<div style="font-family:Arial,sans-serif;line-height:1.55;color:#111827;white-space:pre-wrap;">${escapeHtml(text)}</div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isInactiveWhatsAppRecipient(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();
  return normalized.includes("recipient is not activated")
    || normalized.includes("recipient not activated")
    || normalized.includes("recipient_not_activated")
    || normalized.includes("not a whatsapp user")
    || normalized.includes("not on whatsapp");
}

function isDeterministicProviderRejection(errorMessage: string) {
  const normalized = errorMessage.toLowerCase();
  if (/\b(?:400|401|403|404|405|410|422)\b/.test(normalized)) return true;

  return [
    "invalid",
    "not configured",
    "not active",
    "not activated",
    "not registered",
    "not on whatsapp",
    "not a whatsapp user",
    "forbidden",
    "unauthorized",
    "permission",
    "not verified",
    "unverified",
    "template",
    "recipient",
    "sender",
  ].some((marker) => normalized.includes(marker));
}

async function settleProviderFailure(message: CommunicationMessageWithTemplate, errorMessage: string) {
  if (isDeterministicProviderRejection(errorMessage)) {
    return markMessageFailed(
      message.id,
      isInactiveWhatsAppRecipient(errorMessage) ? "recipient_not_activated" : "provider_error",
      errorMessage,
      message.processingToken,
    );
  }

  return completeDirectDispatch(message, {
    status: "SUBMISSION_UNKNOWN",
    errorCode: "submission_unknown",
    errorMessage,
  });
}

function leaseExpiry(now: Date) {
  return new Date(now.getTime() - DIRECT_DISPATCH_LEASE_MS);
}

function readMessage(messageId: string) {
  return prisma.communicationMessage.findUniqueOrThrow({ where: { id: messageId } });
}

function findMessageContact(contactId: string | null) {
  if (!contactId) return null;
  return prisma.contact.findUnique({
    where: { id: contactId },
    select: { subscribed: true, metadata: true },
  });
}

async function markMessageFailed(
  messageId: string,
  errorCode: string,
  errorMessage: string,
  processingToken?: string | null,
) {
  if (processingToken) {
    await prisma.communicationMessage.updateMany({
      where: { id: messageId, status: { in: ["PROCESSING", "SUBMISSION_UNKNOWN"] }, processingToken },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        errorCode,
        errorMessage,
        processingStartedAt: null,
        processingToken: null,
      },
    });
    return prisma.communicationMessage.findUniqueOrThrow({ where: { id: messageId } });
  }

  return prisma.communicationMessage.update({
    where: { id: messageId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      errorCode,
      errorMessage,
      processingStartedAt: null,
      processingToken: null,
    },
  });
}
