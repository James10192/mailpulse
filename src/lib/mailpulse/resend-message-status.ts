export type ReconciledEmailStatus = "DELIVERED" | "READ" | "FAILED";

type CurrentEmailMessage = {
  status: string;
  deliveredAt: Date | null;
  readAt: Date | null;
};

/** Provider detail carried by a Resend event, already extracted from its payload. */
export type ResendEventDetail = {
  reason?: string | null;
};

type FailureEvent = "email.bounced" | "email.complained" | "email.suppressed" | "email.failed";

const MAX_ERROR_MESSAGE_LENGTH = 500;

const FAILURES: Record<FailureEvent, { errorCode: string; message: string }> = {
  "email.bounced": {
    errorCode: "email_bounced",
    message: "Resend signale que l'email a rebondi.",
  },
  "email.complained": {
    errorCode: "email_complained",
    message: "Resend signale une plainte du destinataire.",
  },
  "email.suppressed": {
    errorCode: "email_suppressed",
    message: "Resend n'a pas envoyé l'email : l'adresse figure sur sa liste de suppression.",
  },
  "email.failed": {
    errorCode: "email_failed",
    message: "Resend n'a pas pu envoyer l'email.",
  },
};

/** Statuses after which no provider event may change the message any more. */
const FINAL_STATUSES = new Set(["FAILED", "CANCELLED"]);
/** Statuses that prove the email reached the recipient. */
const REACHED_STATUSES = new Set(["DELIVERED", "READ"]);

export function resendMessageTransition(
  eventType: string,
  occurredAt: Date,
  message: CurrentEmailMessage,
  detail: ResendEventDetail = {},
) {
  if (!canApplyTransition(message.status, eventType)) return null;

  if (eventType === "email.delivered") {
    return {
      status: "DELIVERED" as const,
      deliveredAt: message.deliveredAt ?? occurredAt,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (eventType === "email.opened" || eventType === "email.clicked") {
    return {
      status: "READ" as const,
      deliveredAt: message.deliveredAt ?? occurredAt,
      readAt: message.readAt ?? occurredAt,
      errorCode: null,
      errorMessage: null,
    };
  }

  if (isFailureEvent(eventType)) {
    const failure = FAILURES[eventType];
    return {
      status: "FAILED" as const,
      failedAt: occurredAt,
      errorCode: failure.errorCode,
      errorMessage: failureMessage(eventType, failure.message, detail.reason),
    };
  }

  return null;
}

/**
 * A delivery delay never changes the status: the provider is still retrying.
 * It is only worth recording while the outcome is open. Once the email is
 * delivered, read or definitively failed, a late delay notice is stale.
 */
export function shouldRecordDeliveryDelay(eventType: string, currentStatus: string) {
  if (eventType !== "email.delivery_delayed") return false;
  return !FINAL_STATUSES.has(currentStatus) && !REACHED_STATUSES.has(currentStatus);
}

/** Resend puts the human-readable reason in a different object per event type. */
export function resendEventReason(eventType: string, data: unknown): string | null {
  const payload = asRecord(data);
  const candidates: Record<string, unknown> = {
    "email.suppressed": asRecord(payload.suppressed).message,
    "email.failed": asRecord(payload.failed).reason,
    "email.bounced": asRecord(payload.bounce).message,
    "email.delivery_delayed": asRecord(payload.delivery_delayed).message ?? asRecord(payload.delay).message,
  };
  const value = candidates[eventType];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function canApplyTransition(currentStatus: string, eventType: string) {
  if (FINAL_STATUSES.has(currentStatus)) return false;
  if (eventType === "email.delivered") return !REACHED_STATUSES.has(currentStatus);
  if (eventType === "email.opened" || eventType === "email.clicked") return currentStatus !== "READ";
  if (REACHED_STATUSES.has(currentStatus)) return false;
  return isFailureEvent(eventType);
}

function isFailureEvent(eventType: string): eventType is FailureEvent {
  return Object.hasOwn(FAILURES, eventType);
}

function failureMessage(eventType: FailureEvent, fallback: string, reason: string | null | undefined) {
  if (!reason || eventType === "email.bounced" || eventType === "email.complained") return fallback;
  const message = eventType === "email.failed"
    ? `Resend n'a pas pu envoyer l'email (motif : ${reason}).`
    : `${fallback} Motif : ${reason}`;
  return message.slice(0, MAX_ERROR_MESSAGE_LENGTH);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
