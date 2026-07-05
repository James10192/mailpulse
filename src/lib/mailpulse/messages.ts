import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../convex/_generated/api";
import type { z } from "zod";
import type { MessageStatus, Prisma } from "@/generated/prisma";
import {
  createMessageSchema,
  toChannel,
  toContentType,
  toRecipientType,
} from "./schemas";
import { serializeMessage } from "./serializers";
import { emitWebhookEvent } from "./webhooks";
import { toPrismaJson } from "./json";
import { sendWhatsApp, meta } from "@/lib/whatsapp";
import { normalizeContactPhone } from "@/lib/phone-numbers";
import { sendEmail } from "@/lib/resend";

type CreateMessageInput = z.infer<typeof createMessageSchema>;
type CommunicationMessageWithTemplate = Prisma.CommunicationMessageGetPayload<{ include: { template: true } }>;
type MailPulseMessageOrganization = {
  whatsappEnabled: boolean;
  whatsappMode: "BAILEYS" | "META";
  whatsappPhone: string | null;
  evoInstanceName: string | null;
  evoInstanceStatus: string | null;
  metaWabaId: string | null;
  metaPhoneNumberId: string | null;
  metaAccessToken: string | null;
};

const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function createCommunicationMessage(params: {
  organizationId: string;
  organization?: MailPulseMessageOrganization;
  input: CreateMessageInput;
  idempotencyKey?: string | null;
  defaultEmailSenderId?: string | null;
}) {
  const channel = toChannel(params.input.channel);
  const recipientType = toRecipientType(params.input.recipient.type);
  const rawRecipientValue = params.input.recipient.value.trim();
  const recipientValue = recipientType === "PHONE" ? normalizeContactPhone(rawRecipientValue) : rawRecipientValue;
  const contentType = toContentType(params.input.content.type);
  const metadata = params.input.metadata ?? {};
  const externalUserId = typeof metadata.external_user_id === "string" ? metadata.external_user_id : null;
  const externalEventId = typeof metadata.external_event_id === "string" ? metadata.external_event_id : null;
  const externalTenantId = typeof metadata.external_tenant_id === "string" ? metadata.external_tenant_id : null;

  const contact = await findContact(params.organizationId, recipientType, recipientValue);
  const conversation = await findOrCreateConversation({
    organizationId: params.organizationId,
    channel,
    recipientType,
    recipientValue,
    contactId: contact?.id ?? null,
    metadata,
  });

  const template =
    params.input.content.type === "template"
      ? await prisma.communicationTemplate.findFirst({
          where: {
            organizationId: params.organizationId,
            templateKey: params.input.content.template_key,
            locale: params.input.content.locale,
            channel,
          },
        })
      : null;

  const compliance = evaluateCompliance({
    channel,
    contentType,
    whatsappMode: params.organization?.whatsappMode ?? "META",
    serviceWindowExpiresAt: conversation.serviceWindowExpiresAt,
    templateStatus: template?.status ?? null,
  });

  const message = await prisma.communicationMessage.create({
    data: {
      organizationId: params.organizationId,
      contactId: contact?.id ?? null,
      conversationId: conversation.id,
      templateId: template?.id ?? null,
      channel,
      recipientType,
      recipientValue,
      contentType,
      text: params.input.content.type === "text" ? params.input.content.text : null,
      templateKey: params.input.content.type === "template" ? params.input.content.template_key : null,
      locale: params.input.content.type === "template" ? params.input.content.locale : null,
      variables: params.input.content.type === "template" ? toPrismaJson(params.input.content.variables ?? {}) : undefined,
      metadata: toPrismaJson(metadata),
      externalUserId,
      externalEventId,
      externalTenantId,
      idempotencyKey: params.idempotencyKey ?? params.input.idempotency_key ?? null,
      status: compliance.status,
      errorCode: compliance.errorCode,
      errorMessage: compliance.errorMessage,
    },
  });

  const dispatchedMessage = await dispatchQueuedMessage(message.id, {
    organization: params.organization,
    defaultEmailSenderId: params.defaultEmailSenderId ?? null,
  });
  const response = serializeMessage(dispatchedMessage);
  await syncLiveMessage(params.organizationId, response);
  await emitWebhookEvent({
    organizationId: params.organizationId,
    type: webhookEventForStatus(dispatchedMessage.status),
    messageId: dispatchedMessage.id,
    data: { message: response },
  });

  return response;
}

async function findContact(organizationId: string, recipientType: "EMAIL" | "PHONE", recipientValue: string) {
  if (recipientType === "EMAIL") {
    return prisma.contact.findFirst({
      where: { organizationId, email: recipientValue.toLowerCase() },
    });
  }

  return prisma.contact.findFirst({
    where: { organizationId, phone: recipientValue },
  });
}

async function findOrCreateConversation(params: {
  organizationId: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  recipientType: "EMAIL" | "PHONE";
  recipientValue: string;
  contactId: string | null;
  metadata: Record<string, unknown>;
}) {
  const existing = await prisma.conversation.findFirst({
    where: {
      organizationId: params.organizationId,
      channel: params.channel,
      recipientValue: params.recipientValue,
      status: "OPEN",
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      organizationId: params.organizationId,
      contactId: params.contactId,
      channel: params.channel,
      recipientType: params.recipientType,
      recipientValue: params.recipientValue,
      metadata: toPrismaJson(params.metadata),
    },
  });
}

function evaluateCompliance(params: {
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  contentType: "TEXT" | "TEMPLATE";
  whatsappMode: "BAILEYS" | "META";
  serviceWindowExpiresAt: Date | null;
  templateStatus: string | null;
}): { status: MessageStatus; errorCode?: string; errorMessage?: string } {
  if (params.channel !== "WHATSAPP") return { status: "QUEUED" };

  if (params.contentType === "TEXT") {
    if (params.whatsappMode === "BAILEYS") return { status: "QUEUED" };

    const windowOpen =
      params.serviceWindowExpiresAt !== null && params.serviceWindowExpiresAt.getTime() > Date.now();
    if (!windowOpen) {
      return {
        status: "TEMPLATE_REQUIRED",
        errorCode: "whatsapp_template_required",
        errorMessage: "WhatsApp free-form messages require an open 24h service window.",
      };
    }
    return { status: "QUEUED" };
  }

  if (params.templateStatus !== "APPROVED") {
    return {
      status: "FAILED",
      errorCode: "template_not_approved",
      errorMessage: "WhatsApp templates must be approved before they can be sent.",
    };
  }

  return { status: "QUEUED" };
}

async function dispatchQueuedMessage(
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
  if (message.status !== "QUEUED") return message;

  if (message.channel === "EMAIL") {
    return dispatchEmailMessage(message, options.defaultEmailSenderId ?? null);
  }

  if (message.channel !== "WHATSAPP") return message;

  if (!options.organization?.whatsappEnabled) {
    return markMessageFailed(message.id, "channel_not_configured", "WhatsApp non configure pour cette organisation.");
  }

  try {
    const result = message.contentType === "TEMPLATE"
      ? await sendWhatsAppTemplate(options.organization, message)
      : await sendWhatsApp(options.organization, message.recipientValue, message.text ?? "");

    return prisma.communicationMessage.update({
      where: { id: message.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerMessageId: result.messageId ?? null,
        errorCode: null,
        errorMessage: null,
      },
    });
  } catch (error) {
    return markMessageFailed(
      message.id,
      "provider_error",
      error instanceof Error ? error.message : "Echec de l'envoi WhatsApp.",
    );
  }
}

async function dispatchEmailMessage(message: CommunicationMessageWithTemplate, defaultEmailSenderId: string | null) {
  try {
    const from = await resolveEmailFromAddress(message, defaultEmailSenderId);
    const result = await sendEmail({
      to: message.recipientValue,
      from,
      subject: emailSubject(message),
      html: emailHtml(message),
      text: message.text ?? "",
      tags: [
        { name: "message_id", value: message.id },
        { name: "channel", value: "email" },
      ],
    });

    return prisma.communicationMessage.update({
      where: { id: message.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        providerMessageId: result.id,
        errorCode: null,
        errorMessage: null,
      },
    });
  } catch (error) {
    return markMessageFailed(
      message.id,
      "provider_error",
      error instanceof Error ? error.message : "Echec de l'envoi email.",
    );
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
    where: {
      organizationId: message.organizationId,
      verified: true,
      status: "verified",
    },
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
    where: {
      organizationId,
      domain,
      verified: true,
      status: "verified",
    },
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

async function sendWhatsAppTemplate(
  organization: MailPulseMessageOrganization,
  message: CommunicationMessageWithTemplate,
) {
  if (organization.whatsappMode === "META") {
    const parameters = jsonObjectValues(message.variables);
    const result = await meta.sendTemplate(
      organization,
      message.recipientValue,
      message.templateKey ?? "",
      message.locale ?? "fr",
      parameters,
    );
    return { success: true, messageId: result.messages?.[0]?.id };
  }

  const body = renderTemplateBody(message.template?.body ?? "", message.variables);
  return sendWhatsApp(organization, message.recipientValue, body);
}

function jsonObjectValues(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.values(value).map((item) => String(item ?? ""));
}

function renderTemplateBody(body: string, variables: unknown) {
  if (!variables || typeof variables !== "object" || Array.isArray(variables)) return body;
  return Object.entries(variables).reduce(
    (content, [key, value]) => content.replaceAll(`{{${key}}}`, String(value ?? "")),
    body,
  );
}

function emailHtml(message: CommunicationMessageWithTemplate) {
  const metadataHtml = emailMetadataValue(message.metadata, "email_html");

  return metadataHtml || textToHtml(message.text ?? "");
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

function markMessageFailed(messageId: string, errorCode: string, errorMessage: string) {
  return prisma.communicationMessage.update({
    where: { id: messageId },
    data: {
      status: "FAILED",
      failedAt: new Date(),
      errorCode,
      errorMessage,
    },
  });
}

function webhookEventForStatus(status: MessageStatus) {
  if (status === "TEMPLATE_REQUIRED") return "message.template_required";
  if (status === "FAILED") return "message.failed";
  return "message.queued";
}

async function syncLiveMessage(organizationId: string, message: ReturnType<typeof serializeMessage>) {
  try {
    const convexApi = api as unknown as {
      communication: {
        upsertMessage: Parameters<typeof convexServer.mutation>[0];
      };
    };
    await convexServer.mutation(convexApi.communication.upsertMessage, {
      organizationId,
      messageId: message.id,
      channel: message.channel,
      status: message.status,
      recipient: message.recipient.value,
      updatedAt: Date.now(),
    });
  } catch {
    // Convex is a live mirror only; durable Prisma writes remain authoritative.
  }
}

export function whatsappServiceWindowExpiresAt(receivedAt = new Date()) {
  return new Date(receivedAt.getTime() + WHATSAPP_WINDOW_MS);
}
