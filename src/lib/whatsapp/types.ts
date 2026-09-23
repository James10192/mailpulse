/**
 * Why a send failed, decided by the provider client from structured signals
 * (response flags, provider error codes, timeouts), never from message text.
 */
export type WhatsAppFailureReason = "recipient_unreachable" | "timeout" | "transport";

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
  reason?: WhatsAppFailureReason;
}

/** fetch rejects with a TimeoutError (AbortSignal.timeout) or an AbortError. */
export function isTimeoutError(error: unknown) {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
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
