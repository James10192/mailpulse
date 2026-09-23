import type { MessageStatus } from "@/generated/prisma";

import type { ResendEventType } from "./resend-webhook-payload";

type CurrentEmailMessage = {
  status: MessageStatus;
  deliveredAt: Date | null;
  readAt: Date | null;
};

/**
 * Statuses whose outcome is still open: the provider may still report delivery,
 * failure or delay. Every other status is settled — reached the recipient
 * (DELIVERED, READ), failed, cancelled, or closed by an operator (RECONCILED,
 * DUPLICATE_CONFIRMED) or never sent (TEMPLATE_REQUIRED) — and a late provider
 * event must not reopen it.
 */
const OPEN_STATUSES: ReadonlySet<MessageStatus> = new Set<MessageStatus>([
  "QUEUED",
  "PROCESSING",
  "RETRYING",
  "SUBMISSION_UNKNOWN",
  "SENT",
]);

const OPEN_OR_DELIVERED: ReadonlySet<MessageStatus> = new Set<MessageStatus>([...OPEN_STATUSES, "DELIVERED"]);
const NONE: ReadonlySet<MessageStatus> = new Set<MessageStatus>();
const MAX_ERROR_MESSAGE_LENGTH = 500;

export function isOutcomeOpen(status: MessageStatus) {
  return OPEN_STATUSES.has(status);
}

type Rule =
  | { kind: "delivered" | "read"; from: ReadonlySet<MessageStatus> }
  | { kind: "failed"; from: ReadonlySet<MessageStatus>; errorCode: string; format: (reason: string | null) => string }
  | { kind: "delay"; from: ReadonlySet<MessageStatus> }
  | { kind: "ignored"; from: ReadonlySet<MessageStatus> };

const RULES: Record<ResendEventType, Rule> = {
  "email.sent": { kind: "ignored", from: NONE },
  "email.delivered": { kind: "delivered", from: OPEN_STATUSES },
  "email.opened": { kind: "read", from: OPEN_OR_DELIVERED },
  "email.clicked": { kind: "read", from: OPEN_OR_DELIVERED },
  "email.delivery_delayed": { kind: "delay", from: OPEN_STATUSES },
  "email.bounced": {
    kind: "failed",
    from: OPEN_STATUSES,
    errorCode: "email_bounced",
    format: (reason) => withReason("Resend signale que l'email a rebondi.", reason),
  },
  "email.complained": {
    kind: "failed",
    from: OPEN_STATUSES,
    errorCode: "email_complained",
    format: () => "Resend signale une plainte du destinataire.",
  },
  "email.suppressed": {
    kind: "failed",
    from: OPEN_STATUSES,
    errorCode: "email_suppressed",
    format: (reason) => withReason("Resend n'a pas envoyé l'email : l'adresse figure sur sa liste de suppression.", reason),
  },
  "email.failed": {
    kind: "failed",
    from: OPEN_STATUSES,
    errorCode: "email_failed",
    format: (reason) => withReason("Resend n'a pas pu envoyer l'email.", reason),
  },
};

export type ResendClassification =
  | { kind: "status"; data: StatusChange }
  | { kind: "delay" }
  | null;

type StatusChange =
  | { status: "DELIVERED"; deliveredAt: Date; errorCode: null; errorMessage: null }
  | { status: "READ"; deliveredAt: Date; readAt: Date; errorCode: null; errorMessage: null }
  | { status: "FAILED"; failedAt: Date; errorCode: string; errorMessage: string };

/**
 * What a Resend event means for a message in its current state: a status
 * change, a delay worth recording, or nothing (stale, duplicate or irrelevant).
 */
export function classifyResendEvent(
  eventType: ResendEventType,
  message: CurrentEmailMessage,
  occurredAt: Date,
  reason: string | null,
): ResendClassification {
  const rule = RULES[eventType];
  if (!rule.from.has(message.status)) return null;

  switch (rule.kind) {
    case "ignored":
      return null;
    case "delay":
      return { kind: "delay" };
    case "delivered":
      return {
        kind: "status",
        data: { status: "DELIVERED", deliveredAt: message.deliveredAt ?? occurredAt, errorCode: null, errorMessage: null },
      };
    case "read":
      return {
        kind: "status",
        data: {
          status: "READ",
          deliveredAt: message.deliveredAt ?? occurredAt,
          readAt: message.readAt ?? occurredAt,
          errorCode: null,
          errorMessage: null,
        },
      };
    case "failed":
      return {
        kind: "status",
        data: {
          status: "FAILED",
          failedAt: occurredAt,
          errorCode: rule.errorCode,
          errorMessage: rule.format(reason).slice(0, MAX_ERROR_MESSAGE_LENGTH),
        },
      };
  }
}

function withReason(message: string, reason: string | null) {
  return reason ? `${message} Motif : ${reason}` : message;
}
