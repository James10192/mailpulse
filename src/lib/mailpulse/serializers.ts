import type {
  CommunicationMessage,
  CommunicationTemplate,
  Contact,
  Conversation,
  WebhookDelivery,
  WebhookEndpoint,
} from "@/generated/prisma";
import {
  fromChannel,
  fromContentType,
  fromMessageStatus,
  fromRecipientType,
  fromTemplateStatus,
} from "./schemas";

export function serializeContact(contact: Contact) {
  const metadata = contact.metadata && typeof contact.metadata === "object" && !Array.isArray(contact.metadata)
    ? (contact.metadata as Record<string, unknown>)
    : {};
  return {
    id: contact.id,
    email: metadata.mailpulse_synthetic_email ? null : contact.email,
    phone: contact.phone,
    first_name: contact.firstName,
    last_name: contact.lastName,
    subscribed: contact.subscribed,
    metadata: contact.metadata,
    created_at: contact.createdAt.toISOString(),
    updated_at: contact.updatedAt.toISOString(),
  };
}

export function serializeTemplate(template: CommunicationTemplate) {
  return {
    id: template.id,
    template_key: template.templateKey,
    name: template.name,
    description: template.description,
    channel: fromChannel(template.channel),
    locale: template.locale,
    content_type: fromContentType(template.contentType),
    subject: template.subject,
    body: template.body,
    variables: template.variables,
    provider_template_id: template.providerTemplateId,
    status: fromTemplateStatus(template.status),
    metadata: template.metadata,
    created_at: template.createdAt.toISOString(),
    updated_at: template.updatedAt.toISOString(),
  };
}

export function serializeConversation(conversation: Conversation) {
  return {
    id: conversation.id,
    channel: fromChannel(conversation.channel),
    recipient: {
      type: fromRecipientType(conversation.recipientType),
      value: conversation.recipientValue,
    },
    status: conversation.status.toLowerCase(),
    service_window_expires_at: conversation.serviceWindowExpiresAt?.toISOString() ?? null,
    last_inbound_at: conversation.lastInboundAt?.toISOString() ?? null,
    closed_at: conversation.closedAt?.toISOString() ?? null,
    metadata: conversation.metadata,
    created_at: conversation.createdAt.toISOString(),
    updated_at: conversation.updatedAt.toISOString(),
  };
}

export function serializeMessage(message: CommunicationMessage) {
  return {
    id: message.id,
    channel: fromChannel(message.channel),
    direction: message.direction.toLowerCase(),
    recipient: {
      type: fromRecipientType(message.recipientType),
      value: message.recipientValue,
    },
    content: {
      type: fromContentType(message.contentType),
      text: message.text,
      template_key: message.templateKey,
      locale: message.locale,
      variables: message.variables,
    },
    status: fromMessageStatus(message.status),
    metadata: message.metadata,
    external_user_id: message.externalUserId,
    external_event_id: message.externalEventId,
    external_tenant_id: message.externalTenantId,
    idempotency_key: message.idempotencyKey,
    conversation_id: message.conversationId,
    contact_id: message.contactId,
    provider_message_id: message.providerMessageId,
    error_code: message.errorCode,
    error_message: message.errorMessage,
    queued_at: message.queuedAt.toISOString(),
    sent_at: message.sentAt?.toISOString() ?? null,
    delivered_at: message.deliveredAt?.toISOString() ?? null,
    read_at: message.readAt?.toISOString() ?? null,
    failed_at: message.failedAt?.toISOString() ?? null,
    retry_count: message.retryCount,
    next_retry_at: message.nextRetryAt?.toISOString() ?? null,
    created_at: message.createdAt.toISOString(),
    updated_at: message.updatedAt.toISOString(),
  };
}

export function serializeWebhook(endpoint: WebhookEndpoint) {
  return {
    id: endpoint.id,
    name: endpoint.name,
    url: endpoint.url,
    events: endpoint.events,
    secret_preview: endpoint.secretPreview,
    active: endpoint.active,
    created_at: endpoint.createdAt.toISOString(),
    updated_at: endpoint.updatedAt.toISOString(),
  };
}

export function serializeWebhookDelivery(delivery: WebhookDelivery) {
  return {
    id: delivery.id,
    event_id: delivery.eventId,
    event_type: delivery.eventType,
    status: delivery.status.toLowerCase(),
    attempts: delivery.attempts,
    last_error: delivery.lastError,
    delivered_at: delivery.deliveredAt?.toISOString() ?? null,
    created_at: delivery.createdAt.toISOString(),
  };
}
