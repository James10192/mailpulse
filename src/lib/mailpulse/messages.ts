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
import { normalizeContactPhone } from "@/lib/phone-numbers";
import { requestHash } from "./idempotency";
import { dispatchQueuedMessage, type MailPulseMessageOrganization } from "./message-direct-dispatch";
import { responseForMessage, type ApiMessageResponse } from "./message-response";
import { canReceiveChannel } from "./consent";
export { responseForMessage, responseForSerializedMessage, type MessageDispatchState } from "./message-response";

type CreateMessageInput = z.infer<typeof createMessageSchema>;

const WHATSAPP_WINDOW_MS = 24 * 60 * 60 * 1000;
const IDEMPOTENCY_TRANSACTION_MAX_RETRIES = 3;

export async function createCommunicationMessage(params: {
  organizationId: string;
  origin: "API" | "PLATFORM" | "CAMPAIGN";
  organization?: MailPulseMessageOrganization;
  input: CreateMessageInput;
  idempotencyKey?: string | null;
  defaultEmailSenderId?: string | null;
}) {
  const message = await createMessageRecord(prisma, params);
  return dispatchAndPublishMessage(message.id, params.organization, params.defaultEmailSenderId ?? null);
}

type CreateCommunicationMessageParams = {
  organizationId: string;
  origin: "API" | "PLATFORM" | "CAMPAIGN";
  organization?: MailPulseMessageOrganization;
  input: CreateMessageInput;
  idempotencyKey?: string | null;
  defaultEmailSenderId?: string | null;
};

type MessageDatabase = Pick<Prisma.TransactionClient,
  "contact" | "conversation" | "communicationTemplate" | "communicationMessage" | "idempotencyRecord">;

export type IdempotentMessageResult =
  | { type: "created"; response: ApiMessageResponse; statusCode: number; messageId: string }
  | { type: "replay"; response: unknown; statusCode: number; messageId: string | null }
  | { type: "conflict"; response: IdempotencyConflictResponse; statusCode: 409; messageId: null };

export type IdempotencyConflictResponse = {
  error: "Idempotency key was already used with a different request body.";
  code: "idempotency_key_reused";
};

const idempotencyConflictResponse: IdempotencyConflictResponse = {
  error: "Idempotency key was already used with a different request body.",
  code: "idempotency_key_reused",
};

/**
 * Persists the idempotency claim, message and replay response together. Provider
 * calls intentionally happen after this transaction: an interrupted request can
 * be replayed without ever creating or sending a second message.
 */
export async function createIdempotentCommunicationMessage(params: CreateCommunicationMessageParams & {
  idempotencyKey: string;
  method: string;
  path: string;
  requestBody: unknown;
}): Promise<IdempotentMessageResult> {
  const expectedRequestHash = requestHash(params.requestBody);
  const replay = await findStoredMessageResponse(params, expectedRequestHash);
  if (replay) return replay;

  for (let attempt = 0; attempt < IDEMPOTENCY_TRANSACTION_MAX_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.idempotencyRecord.findUnique({
          where: {
            organizationId_key_method_path: {
              organizationId: params.organizationId,
              key: params.idempotencyKey,
              method: params.method,
              path: params.path,
            },
          },
        });
        if (existing) {
          return storedIdempotentMessageResult(tx, existing, params.organizationId, params.idempotencyKey, expectedRequestHash);
        }

        const message = await createMessageRecord(tx, params);
        const response = responseForMessage(message);
        await tx.idempotencyRecord.create({
          data: {
            organizationId: params.organizationId,
            key: params.idempotencyKey,
            method: params.method,
            path: params.path,
            requestHash: expectedRequestHash,
            statusCode: response.statusCode,
            responseBody: toPrismaJson(response.response),
          },
        });

        return { type: "created", ...response, messageId: message.id };
      }, { isolationLevel: "Serializable" });
    } catch (error) {
      if (isSerializationConflict(error) && attempt < IDEMPOTENCY_TRANSACTION_MAX_RETRIES - 1) continue;
      if (!isUniqueConstraintError(error)) throw error;

      // A competing request may have committed the claim while this transaction
      // was rolling back. If an older interrupted request left only a message,
      // rebuild its missing replay record from that durable message instead.
      const resolved = await recoverIdempotentMessageResponse(params, expectedRequestHash);
      if (resolved) return resolved;
      throw error;
    }
  }

  throw new Error("Idempotency transaction retries exhausted.");
}

export async function dispatchIdempotentCommunicationMessage(params: {
  messageId: string;
  organizationId: string;
  organization?: MailPulseMessageOrganization;
  defaultEmailSenderId?: string | null;
}) {
  return dispatchAndPublishMessage(params.messageId, params.organization, params.defaultEmailSenderId ?? null);
}

export async function storeIdempotentCommunicationMessageResponse(params: {
  organizationId: string;
  idempotencyKey: string;
  method: string;
  path: string;
  messageId: string;
}) {
  const message = await prisma.communicationMessage.findUniqueOrThrow({ where: { id: params.messageId } });
  const response = responseForMessage(message);
  await prisma.idempotencyRecord.update({
    where: {
      organizationId_key_method_path: {
        organizationId: params.organizationId,
        key: params.idempotencyKey,
        method: params.method,
        path: params.path,
      },
    },
    data: {
      statusCode: response.statusCode,
      responseBody: toPrismaJson(response.response),
    },
  });
  return response;
}

async function createMessageRecord(db: MessageDatabase, params: CreateCommunicationMessageParams) {
  const channel = toChannel(params.input.channel);
  const recipientType = toRecipientType(params.input.recipient.type);
  const rawRecipientValue = params.input.recipient.value.trim();
  const recipientValue = recipientType === "PHONE" ? normalizeContactPhone(rawRecipientValue) : rawRecipientValue;
  const contentType = toContentType(params.input.content.type);
  const metadata = params.input.metadata ?? {};
  const externalUserId = typeof metadata.external_user_id === "string" ? metadata.external_user_id : null;
  const externalEventId = typeof metadata.external_event_id === "string" ? metadata.external_event_id : null;
  const externalTenantId = typeof metadata.external_tenant_id === "string" ? metadata.external_tenant_id : null;

  const contact = await findContact(db, params.organizationId, recipientType, recipientValue);
  const conversation = await findOrCreateConversation({
    db,
    organizationId: params.organizationId,
    channel,
    recipientType,
    recipientValue,
    contactId: contact?.id ?? null,
    metadata,
  });

  const template =
    params.input.content.type === "template"
      ? await db.communicationTemplate.findFirst({
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
  const consentAllowed = canReceiveChannel(contact, channel);

  return db.communicationMessage.create({
    data: {
      organizationId: params.organizationId,
      origin: params.origin,
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
      status: consentAllowed ? compliance.status : "FAILED",
      errorCode: consentAllowed ? compliance.errorCode : "consent_denied",
      errorMessage: consentAllowed ? compliance.errorMessage : "Le destinataire a refuse les messages sur ce canal.",
    },
  });
}

async function dispatchAndPublishMessage(
  messageId: string,
  organization: MailPulseMessageOrganization | undefined,
  defaultEmailSenderId: string | null,
) {
  const dispatchedMessage = await dispatchQueuedMessage(messageId, {
    organization,
    defaultEmailSenderId,
  });
  const response = serializeMessage(dispatchedMessage);
  await syncLiveMessage(dispatchedMessage.organizationId, response);
  await emitWebhookEvent({
    organizationId: dispatchedMessage.organizationId,
    type: webhookEventForStatus(dispatchedMessage.status),
    messageId: dispatchedMessage.id,
    data: { message: response },
  });

  return response;
}

async function findStoredMessageResponse(params: {
  organizationId: string;
  idempotencyKey: string;
  method: string;
  path: string;
}, expectedRequestHash: string) {
  const record = await prisma.idempotencyRecord.findUnique({
    where: {
      organizationId_key_method_path: {
        organizationId: params.organizationId,
        key: params.idempotencyKey,
        method: params.method,
        path: params.path,
      },
    },
  });
  if (!record) return null;
  return storedIdempotentMessageResult(prisma, record, params.organizationId, params.idempotencyKey, expectedRequestHash);
}

async function storedIdempotentMessageResult(
  db: Pick<Prisma.TransactionClient, "communicationMessage">,
  record: { responseBody: Prisma.JsonValue; statusCode: number; requestHash: string },
  organizationId: string,
  idempotencyKey: string,
  expectedRequestHash: string,
) {
  if (record.requestHash !== expectedRequestHash) {
    return { type: "conflict" as const, response: idempotencyConflictResponse, statusCode: 409 as const, messageId: null };
  }
  const message = await db.communicationMessage.findUnique({
    where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
    select: { id: true },
  });
  return {
    type: "replay" as const,
    response: record.responseBody,
    statusCode: record.statusCode,
    messageId: message?.id ?? null,
  };
}

async function recoverIdempotentMessageResponse(params: CreateCommunicationMessageParams & {
  idempotencyKey: string;
  method: string;
  path: string;
  requestBody: unknown;
}, expectedRequestHash: string) {
  const stored = await findStoredMessageResponse(params, expectedRequestHash);
  if (stored) return stored;

  const message = await prisma.communicationMessage.findUnique({
    where: { organizationId_idempotencyKey: { organizationId: params.organizationId, idempotencyKey: params.idempotencyKey } },
  });
  if (!message) return null;

  const response = responseForMessage(message);
  try {
    await prisma.idempotencyRecord.create({
      data: {
        organizationId: params.organizationId,
        key: params.idempotencyKey,
        method: params.method,
        path: params.path,
        requestHash: expectedRequestHash,
        statusCode: response.statusCode,
        responseBody: toPrismaJson(response.response),
      },
    });
    return { type: "replay" as const, ...response, messageId: message.id };
  } catch (error) {
    if (!isUniqueConstraintError(error)) throw error;
    return findStoredMessageResponse(params, expectedRequestHash);
  }
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

function isSerializationConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
}

async function findContact(db: MessageDatabase, organizationId: string, recipientType: "EMAIL" | "PHONE", recipientValue: string) {
  if (recipientType === "EMAIL") {
    return db.contact.findFirst({
      where: { organizationId, email: recipientValue.toLowerCase() },
    });
  }

  return db.contact.findFirst({
    where: { organizationId, phone: recipientValue },
  });
}

async function findOrCreateConversation(params: {
  db: MessageDatabase;
  organizationId: string;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
  recipientType: "EMAIL" | "PHONE";
  recipientValue: string;
  contactId: string | null;
  metadata: Record<string, unknown>;
}) {
  const existing = await params.db.conversation.findFirst({
    where: {
      organizationId: params.organizationId,
      channel: params.channel,
      recipientValue: params.recipientValue,
      status: "OPEN",
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) return existing;

  return params.db.conversation.create({
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

export { applyOrangeSmsDeliveryReceipt, processSmsQueue } from "@/lib/sms/queue";

function webhookEventForStatus(status: MessageStatus) {
  if (status === "TEMPLATE_REQUIRED") return "message.template_required";
  if (status === "FAILED") return "message.failed";
  if (status === "SUBMISSION_UNKNOWN") return "message.submission_unknown";
  if (status === "SENT") return "message.sent";
  if (status === "DELIVERED") return "message.delivered";
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
