// Meta WhatsApp Cloud API client (Graph API)
// Docs: https://developers.facebook.com/docs/whatsapp/cloud-api

import { isTimeoutError, type IWhatsAppProvider, type WhatsAppFailureReason, type WhatsAppSendResult } from "@/lib/whatsapp/types";

const GRAPH_API = "https://graph.facebook.com/v21.0";

// Graph API "Message undeliverable": the recipient cannot receive the message.
const META_RECIPIENT_UNREACHABLE = 131026;

class MetaApiError extends Error {
  readonly statusCode: number;
  readonly code: number | null;

  constructor(message: string, statusCode: number, code: number | null = null) {
    super(message);
    this.name = "MetaApiError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

function metaFailureReason(error: unknown): WhatsAppFailureReason {
  if (error instanceof MetaApiError && error.code === META_RECIPIENT_UNREACHABLE) return "recipient_unreachable";
  if (isTimeoutError(error)) return "timeout";
  return "transport";
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
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string; code?: unknown } };
    const error = body?.error?.message || `HTTP ${res.status}`;
    const code = typeof body?.error?.code === "number" ? body.error.code : null;
    throw new MetaApiError(`Meta API: ${error}`, res.status, code);
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
      };
    }
  }
}
