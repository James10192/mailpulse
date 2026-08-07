export const MESSAGE_STATUS_EVENT = "whatsapp.message_status";

export type MetaMessageStatus = "sent" | "delivered" | "read" | "failed";

/**
 * Deliberately dependency-free: the provider timestamp stays a raw string so
 * this module remains pure and directly testable. The caller validates it with
 * `parseMetaMessageTimestamp` and hands back a `MetaStatusEvent`.
 */
export type MetaStatusUpdate = {
  providerMessageId: string;
  status: MetaMessageStatus;
  recipient: string;
  timestamp: string;
  /** Echo of the value we submit as biz_opaque_callback_data: our operation id. */
  operationHint: string | null;
  errorCode: string | null;
  errorMessage: string | null;
};

export type MetaStatusEvent = MetaStatusUpdate & { occurredAt: Date };

export type OperationStatusTransition = {
  status: "ACCEPTED" | "DELIVERED" | "READ" | "FAILED";
  acceptedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
};

// Rank orders the happy path so an out-of-order webhook can never walk a
// message backwards. Pre-submission states share rank 0 because any provider
// status proves the submission itself reached Meta.
const STATUS_RANK: Record<string, number> = {
  PENDING: 0,
  PROCESSING: 0,
  SUBMISSION_UNKNOWN: 0,
  ACCEPTED: 1,
  DELIVERED: 2,
  READ: 3,
};

const TERMINAL_STATUSES = new Set(["REJECTED", "FAILED", "RECONCILED", "DUPLICATE_CONFIRMED", "COMPLETED"]);

export function parseMetaStatusUpdates(payload: unknown, senderId: string): MetaStatusUpdate[] {
  if (!isRecord(payload) || payload.object !== "whatsapp_business_account" || !Array.isArray(payload.entry)) return [];

  const updates: MetaStatusUpdate[] = [];
  for (const entry of payload.entry) {
    if (!isRecord(entry) || !Array.isArray(entry.changes)) continue;
    for (const change of entry.changes) {
      const value = isRecord(change) && isRecord(change.value) ? change.value : null;
      const metadata = value && isRecord(value.metadata) ? value.metadata : null;
      if (!metadata || metadata.phone_number_id !== senderId || !Array.isArray(value?.statuses)) continue;
      for (const candidate of value.statuses) {
        const update = parseStatusEntry(candidate);
        if (update) updates.push(update);
      }
    }
  }
  return updates;
}

function parseStatusEntry(candidate: unknown): MetaStatusUpdate | null {
  if (!isRecord(candidate)) return null;
  const status = normalizeStatus(candidate.status);
  const providerMessageId = candidate.id;
  const timestamp = candidate.timestamp;
  const recipient = normalizeRecipient(candidate.recipient_id);
  if (!status || typeof providerMessageId !== "string" || !providerMessageId || typeof timestamp !== "string" || !recipient) {
    return null;
  }

  const error = firstStatusError(candidate.errors);
  return {
    providerMessageId,
    status,
    recipient,
    timestamp,
    operationHint: typeof candidate.biz_opaque_callback_data === "string" && candidate.biz_opaque_callback_data
      ? candidate.biz_opaque_callback_data
      : null,
    errorCode: error?.code ?? null,
    errorMessage: error?.message ?? null,
  };
}

/**
 * Returns the operation update to apply, or null when the webhook carries no
 * new information. Repeated and out-of-order deliveries are therefore no-ops.
 */
export function metaOperationStatusTransition(
  currentStatus: string,
  update: Pick<MetaStatusEvent, "status" | "occurredAt">,
): OperationStatusTransition | null {
  if (TERMINAL_STATUSES.has(currentStatus)) return null;
  const currentRank = STATUS_RANK[currentStatus];
  if (currentRank === undefined) return null;

  if (update.status === "failed") {
    // A delivered or read message cannot regress to a failure.
    return currentRank >= 2 ? null : { status: "FAILED", failedAt: update.occurredAt };
  }

  const target = update.status === "sent" ? "ACCEPTED" : update.status === "delivered" ? "DELIVERED" : "READ";
  if (STATUS_RANK[target] <= currentRank) return null;
  if (target === "ACCEPTED") return { status: "ACCEPTED", acceptedAt: update.occurredAt };
  return { status: target, completedAt: update.occurredAt };
}

export type MetaMessageStatusForContract = "SENT" | "DELIVERED" | "READ" | "FAILED";

/** Maps a Meta status onto the platform CommunicationMessage vocabulary. */
export function metaCommunicationMessageStatus(status: MetaMessageStatus): MetaMessageStatusForContract {
  if (status === "sent") return "SENT";
  if (status === "delivered") return "DELIVERED";
  if (status === "read") return "READ";
  return "FAILED";
}

const MESSAGE_RANK: Record<string, number> = {
  QUEUED: 0,
  PROCESSING: 0,
  RETRYING: 0,
  SUBMISSION_UNKNOWN: 0,
  SENT: 1,
  DELIVERED: 2,
  READ: 3,
};

export type CommunicationMessageStatusTransition = {
  status: MetaMessageStatusForContract;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  errorCode?: string | null;
  errorMessage?: string | null;
};

/**
 * The platform rail equivalent of `metaOperationStatusTransition`, applied when
 * a shared Meta number also carries CommunicationMessage traffic.
 */
export function metaCommunicationMessageTransition(
  currentStatus: string,
  update: Pick<MetaStatusEvent, "status" | "occurredAt" | "errorCode" | "errorMessage">,
): CommunicationMessageStatusTransition | null {
  const currentRank = MESSAGE_RANK[currentStatus];
  if (currentRank === undefined) return null;

  if (update.status === "failed") {
    return currentRank >= 2 ? null : {
      status: "FAILED",
      failedAt: update.occurredAt,
      errorCode: update.errorCode ?? "whatsapp_delivery_failed",
      errorMessage: update.errorMessage ?? "Meta signale un echec de livraison WhatsApp.",
    };
  }

  const target = metaCommunicationMessageStatus(update.status);
  if (MESSAGE_RANK[target] <= currentRank) return null;
  if (target === "SENT") return { status: "SENT", sentAt: update.occurredAt, errorCode: null, errorMessage: null };
  if (target === "DELIVERED") return { status: "DELIVERED", deliveredAt: update.occurredAt, errorCode: null, errorMessage: null };
  return {
    status: "READ",
    readAt: update.occurredAt,
    // Only stand in for a delivery timestamp that never arrived: overwriting a
    // recorded one with the read time would back-date it.
    ...(currentStatus === "DELIVERED" ? {} : { deliveredAt: update.occurredAt }),
    errorCode: null,
    errorMessage: null,
  };
}

export function metaStatusEventId(update: Pick<MetaStatusUpdate, "providerMessageId" | "status">) {
  return `${update.providerMessageId}:${update.status}`;
}

/**
 * A status webhook can advance an operation past ACCEPTED. Callers that used to
 * compare against ACCEPTED alone must use these so an idempotent retry of an
 * already delivered command is not reported as unknown or rejected.
 */
export function isProviderConfirmedOperationStatus(status: string) {
  return status === "ACCEPTED" || status === "DELIVERED" || status === "READ";
}

export function isProviderRejectedOperationStatus(status: string) {
  return status === "REJECTED" || status === "FAILED";
}

function normalizeStatus(value: unknown): MetaMessageStatus | null {
  if (value === "sent" || value === "delivered" || value === "failed") return value;
  // `played` is the voice-note equivalent of `read`.
  if (value === "read" || value === "played") return "read";
  return null;
}

function normalizeRecipient(value: unknown) {
  return typeof value === "string" && /^[1-9]\d{6,14}$/.test(value) ? `+${value}` : null;
}

function firstStatusError(errors: unknown) {
  if (!Array.isArray(errors)) return null;
  for (const candidate of errors) {
    if (!isRecord(candidate)) continue;
    const code = typeof candidate.code === "number" ? String(candidate.code) : typeof candidate.code === "string" ? candidate.code : null;
    const message = typeof candidate.title === "string" && candidate.title
      ? candidate.title
      : typeof candidate.message === "string" && candidate.message
        ? candidate.message
        : null;
    if (code || message) return { code, message };
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
