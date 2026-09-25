import type { MetaMessageStatus } from "./message-status";

/**
 * Delivery acknowledgements Evolution relays from WhatsApp Web, as the same
 * four statuses the Meta rail reports, so both transports share one
 * transition table. Kept dependency-free so the parsing is directly testable.
 */
export type BaileysStatusUpdate = {
  providerMessageId: string;
  status: MetaMessageStatus;
};

const MAX_UPDATES_PER_REQUEST = 100;

/** Evolution has shipped both the Baileys names and their numeric codes. */
const STATUS_BY_ACK: Record<string, MetaMessageStatus | null> = {
  ERROR: "failed",
  "0": "failed",
  PENDING: null,
  "1": null,
  SERVER_ACK: "sent",
  "2": "sent",
  DELIVERY_ACK: "delivered",
  "3": "delivered",
  READ: "read",
  "4": "read",
  PLAYED: "read",
  "5": "read",
};

export function getBaileysStatusUpdates(payload: unknown): BaileysStatusUpdate[] {
  if (!isRecord(payload) || typeof payload.event !== "string") return [];
  if (payload.event.toLowerCase().replace(".", "_") !== "messages_update") return [];

  const entries = (Array.isArray(payload.data) ? payload.data : [payload.data]).slice(0, MAX_UPDATES_PER_REQUEST);
  const updates: BaileysStatusUpdate[] = [];
  for (const entry of entries) {
    const update = toStatusUpdate(entry);
    if (update) updates.push(update);
  }
  return updates;
}

/**
 * Current Evolution builds put the WhatsApp id in `keyId` (their own `messageId`
 * is a database id); older ones nest it under `key`. Only acknowledgements of
 * our own messages matter: a status on a message the recipient sent is not a
 * delivery of anything we submitted.
 */
function toStatusUpdate(entry: unknown): BaileysStatusUpdate | null {
  if (!isRecord(entry)) return null;
  const key = isRecord(entry.key) ? entry.key : null;
  const fromMe = entry.fromMe ?? key?.fromMe;
  if (fromMe === false) return null;

  const providerMessageId = firstString(entry.keyId, key?.id);
  const rawStatus = entry.status ?? (isRecord(entry.update) ? entry.update.status : undefined);
  const status = typeof rawStatus === "string" || typeof rawStatus === "number" ? STATUS_BY_ACK[String(rawStatus).toUpperCase()] : undefined;
  return providerMessageId && status ? { providerMessageId, status } : null;
}

function firstString(...values: unknown[]) {
  for (const value of values) if (typeof value === "string" && value) return value;
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
