import { prisma } from "@/lib/prisma";
import { convexServer } from "@/lib/convex-server";
import { api } from "../../../convex/_generated/api";
import type { z } from "zod";
import type { MessageStatus } from "@/generated/prisma";
import {
  createMessageSchema,
  toChannel,
  toContentType,
  toRecipientType,
} from "./schemas";
import { serializeMessage } from "./serializers";
import { emitWebhookEvent } from "./webhooks";
import { toPrismaJson } from "./json";

type CreateMessageInput = z.infer<typeof createMessageSchema>;

const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function createCommunicationMessage(params: {
  organizationId: string;
  input: CreateMessageInput;
  idempotencyKey?: string | null;
}) {
  const channel = toChannel(params.input.channel);
  const recipientType = toRecipientType(params.input.recipient.type);
  const recipientValue = params.input.recipient.value.trim();
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

  const response = serializeMessage(message);
  await syncLiveMessage(params.organizationId, response);
  await emitWebhookEvent({
    organizationId: params.organizationId,
    type: webhookEventForStatus(message.status),
    messageId: message.id,
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
  serviceWindowExpiresAt: Date | null;
  templateStatus: string | null;
}): { status: MessageStatus; errorCode?: string; errorMessage?: string } {
  if (params.channel !== "WHATSAPP") return { status: "QUEUED" };

  if (params.contentType === "TEXT") {
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
