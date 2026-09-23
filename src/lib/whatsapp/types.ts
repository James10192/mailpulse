import { isDeterministicRejection } from "@/lib/http-status";

/**
 * Why a send failed, decided by the provider client from structured signals
 * (response flags, provider error codes, HTTP status, timeouts), never from
 * message text.
 * - recipient_unreachable, rejected, rate_limited: nothing was sent.
 * - timeout, transport: ambiguous, the message may still have gone out.
 *
 * "Nothing was sent" is not "permanent": a rejection can follow a session that
 * was briefly down, and a rate limit lifts. None of these reasons is a signal
 * to stop retrying.
 */
export type WhatsAppFailureReason = "recipient_unreachable" | "rejected" | "rate_limited" | "timeout" | "transport";

export type WhatsAppSendResult =
  | { success: true; messageId?: string }
  | { success: false; error: string; reason: WhatsAppFailureReason; statusCode?: number; retryAfterSeconds?: number };

/**
 * fetch rejects with a DOMException named TimeoutError (AbortSignal.timeout) or
 * AbortError. Checked by name, since a DOMException is not always an Error.
 */
export function isTimeoutError(error: unknown) {
  if (typeof error !== "object" || error === null || !("name" in error)) return false;
  return error.name === "TimeoutError" || error.name === "AbortError";
}

/** Classifies the HTTP status of a failed provider call, or null when the status says nothing. */
export function statusFailureReason(status: number | null | undefined): WhatsAppFailureReason | null {
  if (typeof status !== "number") return null;
  if (status === 408) return "timeout";
  if (status === 429) return "rate_limited";
  return isDeterministicRejection(status) ? "rejected" : null;
}

export interface IWhatsAppProvider {
  sendText(to: string, text: string): Promise<WhatsAppSendResult>;
  sendTemplate(to: string, templateName: string, languageCode: string, parameters?: string[]): Promise<WhatsAppSendResult>;
  sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult>;
}

// Discriminated union for config
export type WhatsAppProviderConfig =
  | { mode: "BAILEYS"; instanceName: string }
  | { mode: "META"; phoneNumberId: string; accessToken: string };
