// How long a Baileys send shows "typing…" before the message leaves, and how
// long MailPulse waits for Evolution to answer that send.
//
// Evolution 2.3.7 turns the `delay` of a send into presenceSubscribe, composing,
// a wait, paused, then the message, all inside the HTTP request. WhatsApp's
// 2019 white paper names an account that sends without ever showing the typing
// indicator as an abuse signal, so every send carries one.

/**
 * - interactive: the recipient is waiting for this very message. Short typing,
 *   since the caller holds the request. Today: verification codes.
 * - bulk: one send per request or per queued job (the messages API, external
 *   application commands and invitations). Full human typing.
 * - inline_batch: sends made one after another inside a single request
 *   (campaign send, scheduled campaigns, recovery sequences, dashboard
 *   messages). Short typing, so the loop still fits in its request until these
 *   sends move to a paced queue.
 */
export type BaileysSendPriority = "interactive" | "bulk" | "inline_batch";

const TYPING_BOUNDS_MS: Record<BaileysSendPriority, { min: number; max: number }> = {
  // The typing presence expires after about 10 s on WhatsApp's side: a longer
  // delay would show the indicator vanish before the message arrives.
  bulk: { min: 2_000, max: 10_000 },
  interactive: { min: 1_000, max: 4_000 },
  inline_batch: { min: 500, max: 1_500 },
};

/**
 * Network and Evolution overhead on top of the typing delay. It was the whole
 * budget of a call before the delay existed, minus the old fixed 500 ms delay
 * and a little headroom, so the longest bulk send stays under 20 s.
 */
export const EVOLUTION_REQUEST_MARGIN_MS = 8_000;

/** Timeout of any Evolution call that simulates no typing. */
export const EVOLUTION_DEFAULT_TIMEOUT_MS = 10_000;

/**
 * A human typing speed, `length / U(3, 5) chars/s`, jittered by U(0.75, 1.25)
 * and clamped to the priority's bounds. `random` returns values in [0, 1).
 */
export function typingDelayMs(textLength: number, priority: BaileysSendPriority, random: () => number = Math.random) {
  const charsPerSecond = 3 + 2 * random();
  const jitter = 0.75 + 0.5 * random();
  const raw = (Math.max(0, textLength) / charsPerSecond) * 1_000 * jitter;
  const { min, max } = TYPING_BOUNDS_MS[priority];
  return Math.round(Math.min(max, Math.max(min, raw)));
}

/** Evolution holds the request for the whole typing delay, so the timeout must outlast it. */
export function sendTimeoutMs(typingDelay: number) {
  return typingDelay + EVOLUTION_REQUEST_MARGIN_MS;
}

/** The longest any single Baileys send can hold its caller, whatever its priority. */
export const MAX_SEND_TIMEOUT_MS = sendTimeoutMs(Math.max(...Object.values(TYPING_BOUNDS_MS).map((bounds) => bounds.max)));
