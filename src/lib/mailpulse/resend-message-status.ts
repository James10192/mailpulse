import type { MessageStatus } from "@/generated/prisma";

import { statusesForOutcome } from "./message-outcomes";
import type { ResendEventType } from "./resend-webhook-payload";

type CurrentEmailMessage = {
  status: MessageStatus;
  deliveredAt: Date | null;
  readAt: Date | null;
};

/**
 * A message is still open while the dashboard counts it as pending or sent:
 * the provider may still report delivery, failure or delay. Every other status
 * is settled (reached the recipient, failed, cancelled, closed by an operator
 * or never sent) and a late provider event must not reopen it.
 */
const OPEN_STATUSES: ReadonlySet<MessageStatus> = new Set<MessageStatus>([
  ...statusesForOutcome("pending"),
  ...statusesForOutcome("sent"),
]);
const MAX_ERROR_MESSAGE_LENGTH = 500;

export function isOutcomeOpen(status: MessageStatus) {
  return OPEN_STATUSES.has(status);
}

function isOpenOrDelivered(status: MessageStatus) {
  return isOutcomeOpen(status) || status === "DELIVERED";
}

type Accepts = (status: MessageStatus) => boolean;

type Rule =
  | { kind: "delivered" | "read" | "delay"; accepts: Accepts }
  | { kind: "failed"; accepts: Accepts; errorCode: string; format: (reason: string | null) => string }
  | { kind: "ignored" };

const RULES: Record<ResendEventType, Rule> = {
  "email.sent": { kind: "ignored" },
  "email.delivered": { kind: "delivered", accepts: isOutcomeOpen },
  "email.opened": { kind: "read", accepts: isOpenOrDelivered },
  "email.clicked": { kind: "read", accepts: isOpenOrDelivered },
  "email.delivery_delayed": { kind: "delay", accepts: isOutcomeOpen },
  "email.bounced": {
    kind: "failed",
    accepts: isOutcomeOpen,
    errorCode: "email_bounced",
    format: (reason) => withReason("Resend signale que l'email a rebondi.", reason),
  },
  "email.complained": {
    kind: "failed",
    accepts: isOutcomeOpen,
    errorCode: "email_complained",
    format: () => "Resend signale une plainte du destinataire.",
  },
  "email.suppressed": {
    kind: "failed",
    accepts: isOutcomeOpen,
    errorCode: "email_suppressed",
    format: (reason) => withReason("Resend n'a pas envoyé l'email : l'adresse figure sur sa liste de suppression.", reason),
  },
  "email.failed": {
    kind: "failed",
    accepts: isOutcomeOpen,
    errorCode: "email_failed",
    format: (reason) => withReason("Resend n'a pas pu envoyer l'email.", reason),
  },
};

export type StatusChange =
  | { status: "DELIVERED"; deliveredAt: Date; errorCode: null; errorMessage: null }
  | { status: "READ"; deliveredAt: Date; readAt: Date; errorCode: null; errorMessage: null }
  | { status: "FAILED"; failedAt: Date; errorCode: string; errorMessage: string };

export type ResendClassification =
  | { kind: "status"; data: StatusChange }
  | { kind: "delay" }
  | null;

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
  if (rule.kind === "ignored" || !rule.accepts(message.status)) return null;

  switch (rule.kind) {
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
