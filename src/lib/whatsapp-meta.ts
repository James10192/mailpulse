// Meta WhatsApp Cloud API client (Graph API)
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

import { retryAfterSeconds } from "@/lib/http-status";
import { isTimeoutError, statusFailureReason, type IWhatsAppProvider, type WhatsAppFailureReason, type WhatsAppSendResult } from "@/lib/whatsapp/types";

const GRAPH_API = "https://graph.facebook.com/v21.0";

// Graph API "Message undeliverable": the recipient cannot receive the message.
const META_RECIPIENT_UNREACHABLE = 131026;

class MetaApiError extends Error {
  readonly statusCode: number;
  readonly code: number | null;
  readonly retryAfterSeconds: number | null;

  constructor(message: string, statusCode: number, code: number | null = null, retryAfterSeconds: number | null = null) {
    super(message);
    this.name = "MetaApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

// Graph API throughput limit, answered with a 400 rather than a 429.
const META_RATE_LIMITED = 130429;

function metaFailureReason(error: unknown): WhatsAppFailureReason {
  if (error instanceof MetaApiError && error.code === META_RECIPIENT_UNREACHABLE) return "recipient_unreachable";
  if (error instanceof MetaApiError && error.code === META_RATE_LIMITED) return "rate_limited";
  if (isTimeoutError(error)) return "timeout";
  if (error instanceof MetaApiError) return statusFailureReason(error.statusCode) ?? "transport";
  return "transport";
}

type GraphErrorBody = { error: { message?: string; code?: number } };

/** The `{ error: { message, code } }` body the Graph API answers on failure. */
function isGraphErrorBody(body: unknown): body is GraphErrorBody {
  if (typeof body !== "object" || body === null || !("error" in body)) return false;
  const { error } = body;
  return typeof error === "object" && error !== null;
}

interface MetaOrgConfig {
  metaPhoneNumberId: string | null;
  metaAccessToken: string | null;
}

async function metaFetch<T = unknown>(
  path: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${GRAPH_API}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    const graphError = isGraphErrorBody(body) ? body.error : null;
    const error = typeof graphError?.message === "string" && graphError.message ? graphError.message : `HTTP ${res.status}`;
    const code = typeof graphError?.code === "number" ? graphError.code : null;
    throw new MetaApiError(`Meta API: ${error}`, res.status, code, retryAfterSeconds(res.headers));
  }

  return res.json() as Promise<T>;
}

// ─── Helpers ───────────────────────────────────────────

function assertMetaConfig(org: MetaOrgConfig): asserts org is { metaPhoneNumberId: string; metaAccessToken: string } {
  if (!org.metaPhoneNumberId || !org.metaAccessToken) {
    throw new Error("Meta Cloud API non configure pour cette organisation.");
  }
}

function normalizePhone(to: string) {
  return to.replace(/^\+/, "").replace(/\s/g, "");
}

// ─── Send Messages ──────────────────────────────────────

interface MetaSendResult {
  messaging_product: string;
  contacts: { input: string; wa_id: string }[];
  messages: { id: string }[];
}

export async function sendText(
  org: MetaOrgConfig,
  to: string,
  text: string,
) {
  assertMetaConfig(org);
  const phone = normalizePhone(to);

  return metaFetch<MetaSendResult>(
    `/${org.metaPhoneNumberId}/messages`,
    org.metaAccessToken,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: text },
      }),
    },
  );
}

export async function sendTemplate(
  org: MetaOrgConfig,
  to: string,
  templateName: string,
  languageCode: string,
  parameters: string[] = [],
) {
  assertMetaConfig(org);
  const phone = normalizePhone(to);

  const components = parameters.length > 0
    ? [{
        type: "body",
        parameters: parameters.map((p) => ({ type: "text", text: p })),
      }]
    : [];

  return metaFetch<MetaSendResult>(
    `/${org.metaPhoneNumberId}/messages`,
    org.metaAccessToken,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    },
  );
}

export async function sendImage(
  org: MetaOrgConfig,
  to: string,
  imageUrl: string,
  caption?: string,
) {
  assertMetaConfig(org);
  const phone = normalizePhone(to);

  return metaFetch<MetaSendResult>(
    `/${org.metaPhoneNumberId}/messages`,
    org.metaAccessToken,
    {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "image",
        image: {
          link: imageUrl,
          ...(caption ? { caption } : {}),
        },
      }),
    },
  );
}

// ─── Webhook Verification ───────────────────────────────

export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
): string | null {
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && token === verifyToken && challenge) {
    return challenge;
  }
  return null;
}

// ─── Helpers ────────────────────────────────────────────

export function isMetaConfigured(org: MetaOrgConfig) {
  return !!(org.metaPhoneNumberId && org.metaAccessToken);
}

// Facebook App ID for Embedded Signup (set in env)
export function getAppId() {
  return process.env.META_APP_ID || "";
}

export function getConfigId() {
  return process.env.META_CONFIG_ID || "";
}

export class MetaProvider implements IWhatsAppProvider {
  private readonly phoneNumberId: string;
  private readonly accessToken: string;

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
  }

  async sendText(to: string, text: string): Promise<WhatsAppSendResult> {
    try {
      const result = await sendText(
        { metaPhoneNumberId: this.phoneNumberId, metaAccessToken: this.accessToken },
        to,
        text,
      );
      const messageId = result.messages?.[0]?.id;
      return {
        success: true,
        messageId,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown Meta API error",
        statusCode: err instanceof MetaApiError ? err.statusCode : undefined,
        reason: metaFailureReason(err),
        ...(err instanceof MetaApiError && err.retryAfterSeconds ? { retryAfterSeconds: err.retryAfterSeconds } : {}),
      };
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string,
    parameters: string[] = [],
  ): Promise<WhatsAppSendResult> {
    try {
      const result = await sendTemplate(
        { metaPhoneNumberId: this.phoneNumberId, metaAccessToken: this.accessToken },
        to,
        templateName,
        languageCode,
        parameters,
      );
      const messageId = result.messages?.[0]?.id;
      return {
        success: true,
        messageId,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown Meta API error",
        statusCode: err instanceof MetaApiError ? err.statusCode : undefined,
        reason: metaFailureReason(err),
        ...(err instanceof MetaApiError && err.retryAfterSeconds ? { retryAfterSeconds: err.retryAfterSeconds } : {}),
      };
    }
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult> {
    try {
      const result = await sendImage(
        { metaPhoneNumberId: this.phoneNumberId, metaAccessToken: this.accessToken },
        to,
        imageUrl,
        caption,
      );
      const messageId = result.messages?.[0]?.id;
      return {
        success: true,
        messageId,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown Meta API error",
        statusCode: err instanceof MetaApiError ? err.statusCode : undefined,
        reason: metaFailureReason(err),
        ...(err instanceof MetaApiError && err.retryAfterSeconds ? { retryAfterSeconds: err.retryAfterSeconds } : {}),
      };
    }
  }
}
