/**
 * Why a send failed, decided by the provider client from structured signals
 * (response flags, provider error codes, HTTP status, timeouts), never from
 * message text.
 * - recipient_unreachable, rejected: definite refusals, nothing was sent.
 * - timeout, transport: ambiguous, the message may still have gone out.
 */
export type WhatsAppFailureReason = "recipient_unreachable" | "rejected" | "timeout" | "transport";

export type WhatsAppSendResult =
  | { success: true; messageId?: string }
  | { success: false; error: string; reason: WhatsAppFailureReason; statusCode?: number };

/**
 * fetch rejects with a DOMException named TimeoutError (AbortSignal.timeout) or
 * AbortError. Checked by name, since a DOMException is not always an Error.
 */
export function isTimeoutError(error: unknown) {
  if (typeof error !== "object" || error === null || !("name" in error)) return false;
  return error.name === "TimeoutError" || error.name === "AbortError";
}

/** An explicit 4xx answer: the provider refused the request, nothing was sent. */
export function isRejectedStatus(status: number | null | undefined) {
  return typeof status === "number" && status >= 400 && status < 500;
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
