/**
 * The payload every consent and message event carries to the client
 * application, kept dependency-free so its shape is directly testable.
 */

export const EXTERNAL_EVENTS = [
  "consent.requested",
  "consent.granted",
  "consent.refused",
  "consent.expired",
  "message.sent",
  "message.delivered",
  "message.read",
  "message.failed",
] as const;

export type ExternalEventName = (typeof EXTERNAL_EVENTS)[number];

export type ExternalEventSubject = {
  operationId: string;
  operationKey: string;
  idempotencyKey: string;
};

export type ExternalEventPayloadInput = {
  event: ExternalEventName;
  /** Null for a yes or a stop written with no command waiting. */
  subject: ExternalEventSubject | null;
  recipient: string;
  occurredAt: Date;
  messageId?: string | null;
  failureCode?: string | null;
};

export function buildExternalEventPayload(input: ExternalEventPayloadInput) {
  const payload: Record<string, string | null> = {
    event: input.event,
    operationKey: input.subject?.operationKey ?? null,
    idempotencyKey: input.subject?.idempotencyKey ?? null,
    operationId: input.subject?.operationId ?? null,
    recipient: input.recipient,
    occurredAt: input.occurredAt.toISOString(),
  };
  if (input.event.startsWith("message.")) payload.messageId = input.messageId ?? null;
  if (input.event === "message.failed") payload.failureCode = input.failureCode ?? "whatsapp_delivery_failed";
  return payload;
}

/** The provider status that maps to a message event, if any. */
export function messageEventForStatus(status: "sent" | "delivered" | "read" | "failed"): ExternalEventName {
  return `message.${status}`;
}
