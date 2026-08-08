import type { InboundMessage } from "@/lib/external-applications/meta-webhook";

/** WhatsApp Web ids for groups, broadcasts and status updates are not parents. */
const DIRECT_CHAT_SUFFIX = "@s.whatsapp.net";

/**
 * WhatsApp is migrating direct chats to linked ids, which carry the real number
 * in a companion field. Rejecting them outright would silently kill every
 * inbound message on a migrated instance.
 */
const LINKED_ID_SUFFIX = "@lid";

/** Matches the Meta rail, so both transports admit the same senders. */
const E164_DIGITS = /^[1-9]\d{6,14}$/;

/** One serializable transaction per message: an unbounded batch times out. */
const MAX_MESSAGES_PER_REQUEST = 100;

const MIN_TIMESTAMP_MS = Date.UTC(2000, 0, 1);
const MAX_TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

export function getBaileysInstanceName(payload: unknown) {
  if (!isRecord(payload)) return null;
  const instance = payload.instance ?? payload.instanceName;
  return typeof instance === "string" && instance ? instance : null;
}

/**
 * Evolution emits one event per message but has shipped `data` as both an
 * object and an array, so both shapes are accepted.
 */
export function getInboundTextMessages(payload: unknown, now = new Date()): InboundMessage[] {
  if (!isRecord(payload)) return [];
  if (typeof payload.event === "string" && payload.event.toLowerCase().replace(".", "_") !== "messages_upsert") return [];

  const entries = (Array.isArray(payload.data) ? payload.data : [payload.data]).slice(0, MAX_MESSAGES_PER_REQUEST);
  const messages: InboundMessage[] = [];
  for (const entry of entries) {
    const message = toInboundMessage(entry, now);
    if (message) messages.push(message);
  }
  return messages;
}

function toInboundMessage(entry: unknown, now: Date): InboundMessage | null {
  if (!isRecord(entry) || !isRecord(entry.key)) return null;
  // Our own outbound messages are echoed back; recording them would make the
  // chatbot answer itself.
  if (entry.key.fromMe === true) return null;

  const sender = resolveSender(entry);
  if (!sender) return null;

  const providerMessageId = entry.key.id;
  if (typeof providerMessageId !== "string" || !providerMessageId) return null;

  const text = getMessageText(entry.message);
  if (!text) return null;

  const occurredAt = parseTimestamp(entry.messageTimestamp, now);
  return {
    sender,
    text,
    providerMessageId,
    timestamp: String(Math.floor(occurredAt.getTime() / 1000)),
    occurredAt,
  };
}

/**
 * A linked id carries no phone number, so the companion field is the only way
 * back to the parent. Device suffixes such as `2250707123456:12` denote a
 * companion device and must be dropped, not folded into the digits: doing so
 * would build a different number and apply a STOP to the wrong contact.
 */
function resolveSender(entry: Record<string, unknown>) {
  const key = entry.key as Record<string, unknown>;
  const remoteJid = key.remoteJid;
  if (typeof remoteJid !== "string") return null;

  if (remoteJid.endsWith(LINKED_ID_SUFFIX)) {
    const companion = entry.senderPn ?? entry.participantPn ?? key.senderPn;
    return typeof companion === "string" ? normalizeSender(companion.split("@")[0]) : null;
  }

  return remoteJid.endsWith(DIRECT_CHAT_SUFFIX)
    ? normalizeSender(remoteJid.slice(0, -DIRECT_CHAT_SUFFIX.length))
    : null;
}

/**
 * Unwraps the envelopes WhatsApp puts around an ordinary text. A parent using
 * disappearing messages would otherwise never get an answer.
 */
function getMessageText(message: unknown, depth = 0): string | null {
  if (!isRecord(message) || depth > 3) return null;
  if (typeof message.conversation === "string" && message.conversation) return message.conversation;

  const extended = message.extendedTextMessage;
  if (isRecord(extended) && typeof extended.text === "string" && extended.text) return extended.text;

  for (const wrapper of ["ephemeralMessage", "viewOnceMessage", "viewOnceMessageV2", "documentWithCaptionMessage"]) {
    const wrapped = message[wrapper];
    if (isRecord(wrapped)) {
      const text = getMessageText(wrapped.message, depth + 1);
      if (text) return text;
    }
  }

  return null;
}

/**
 * Evolution sends seconds, as a number or a string depending on version, and
 * some builds send milliseconds. An unbounded value would open a conversation
 * window expiring centuries from now and hand the school app a nonsense date.
 */
function parseTimestamp(value: unknown, now: Date) {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(raw) || raw <= 0) return now;

  const milliseconds = raw > 1e11 ? raw : raw * 1000;
  return milliseconds >= MIN_TIMESTAMP_MS && milliseconds <= now.getTime() + MAX_TIMESTAMP_SKEW_MS
    ? new Date(milliseconds)
    : now;
}

function normalizeSender(value: string) {
  // A colon introduces the companion device index; everything after it belongs
  // to the device, not to the number.
  const digits = value.split(":")[0].trim();
  return E164_DIGITS.test(digits) ? `+${digits}` : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
