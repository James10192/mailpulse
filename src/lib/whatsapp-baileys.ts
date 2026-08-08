// Evolution API client — REST wrapper for Baileys WhatsApp sessions
// Docs: https://doc.evolution-api.com

import type { IWhatsAppProvider, WhatsAppSendResult } from "@/lib/whatsapp/types";

const EVO_URL = process.env.EVOLUTION_API_URL || "";
const EVO_KEY = process.env.EVOLUTION_API_KEY || "";

type EvolutionMessageError = {
  exists?: boolean;
  jid?: string;
  number?: string;
};

type EvolutionErrorBody = {
  message?: unknown;
  response?: {
    message?: unknown;
  };
};

/**
 * Carries the HTTP status so callers can tell a definitive refusal from an
 * ambiguous failure. Without it a wrong phone number and a network timeout look
 * identical, and every unreachable parent lands in manual reconciliation.
 */
export class EvolutionApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly recipientUnreachable: boolean,
  ) {
    super(message);
    this.name = "EvolutionApiError";
  }

  /**
   * Allow-list, never a status range. Evolution answers 400 both for "this
   * number has no WhatsApp account" and for "the session is currently
   * disconnected", and treating the second as final would permanently drop
   * every notification sent while the school's phone was offline.
   */
  get deterministic() {
    return this.recipientUnreachable;
  }
}

function isRecipientUnreachable(body: string) {
  try {
    const parsed = JSON.parse(body) as EvolutionErrorBody;
    const messages = parsed.response?.message ?? parsed.message;
    const firstMessage = Array.isArray(messages) ? messages[0] : messages;
    return (
      !!firstMessage
      && typeof firstMessage === "object"
      && "exists" in firstMessage
      && (firstMessage as EvolutionMessageError).exists === false
    );
  } catch {
    return false;
  }
}

function getEvolutionErrorMessage(status: number, body: string) {
  try {
    const parsed = JSON.parse(body) as EvolutionErrorBody;
    const messages = parsed.response?.message ?? parsed.message;
    const firstMessage = Array.isArray(messages) ? messages[0] : messages;

    if (
      firstMessage &&
      typeof firstMessage === "object" &&
      "exists" in firstMessage
    ) {
      const error = firstMessage as EvolutionMessageError;
      if (error.exists === false) {
        const recipient = error.number ?? error.jid?.replace("@s.whatsapp.net", "");
        return recipient
          ? `Le numéro ${recipient} n'est pas enregistré sur WhatsApp. Vérifiez le numéro ou utilisez un autre contact.`
          : "Ce numéro n'est pas enregistré sur WhatsApp. Vérifiez le numéro ou utilisez un autre contact.";
      }
    }

    if (typeof firstMessage === "string" && firstMessage.trim()) {
      return firstMessage;
    }
  } catch {
    // Keep the original body below when Evolution returns a non-JSON error.
  }

  return body ? `Evolution API ${status}: ${body}` : `Evolution API ${status}`;
}

async function evoFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!EVO_URL || !EVO_KEY) {
    throw new Error("Evolution API non configurée.");
  }

  // The api key and every parent phone number and message body travel in this
  // request. Plain HTTP would put them, and the key that controls every school
  // session, on the wire in clear.
  if (process.env.NODE_ENV === "production" && !EVO_URL.startsWith("https://")) {
    throw new Error("EVOLUTION_API_URL doit etre en HTTPS en production.");
  }

  const res = await fetch(`${EVO_URL}${path}`, {
    ...options,
    // Evolution proxies a WhatsApp Web session that can hang through a
    // reconnection, and the caller holds a lease while it waits.
    signal: AbortSignal.timeout(10_000),
    headers: {
      "Content-Type": "application/json",
      apikey: EVO_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new EvolutionApiError(
      getEvolutionErrorMessage(res.status, body),
      res.status,
      isRecipientUnreachable(body),
    );
  }

  const text = await res.text();
  if (!text) return {} as T;

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

// ─── Instance Management ────────────────────────────────

interface CreateInstanceResult {
  instanceName: string;
  instanceId: string;
  status: string;
  hash: { apikey: string };
  qrcode?: { base64: string; code: string };
}

export async function createInstance(instanceName: string) {
  return evoFetch<CreateInstanceResult>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      rejectCall: false,
      groupsIgnore: true,
      alwaysOnline: false,
      readMessages: false,
      readStatus: false,
      syncFullHistory: false,
    }),
  });
}

interface ConnectResult {
  pairingCode?: string;
  code?: string;
  base64?: string;
  qrcode?: {
    base64?: string;
    code?: string;
  };
  count?: number;
}

export async function getQrCode(instanceName: string) {
  return evoFetch<ConnectResult>(
    `/instance/connect/${instanceName}`,
  );
}

interface ConnectionState {
  instance?: {
    instanceName: string;
    state: "open" | "close" | "connecting";
  };
  instanceName?: string;
  state?: "open" | "close" | "connecting";
}

export async function getConnectionState(instanceName: string) {
  const result = await evoFetch<ConnectionState>(
    `/instance/connectionState/${instanceName}`,
  );

  return {
    instanceName: result.instance?.instanceName ?? result.instanceName ?? instanceName,
    state: result.instance?.state ?? result.state ?? "close",
  };
}

interface InstanceInfo {
  instanceName: string;
  instanceId: string;
  owner?: string;
  profileName?: string;
  profilePictureUrl?: string;
  status: string;
}

export async function fetchInstances() {
  return evoFetch<InstanceInfo[]>("/instance/fetchInstances");
}

export async function deleteInstance(instanceName: string) {
  return evoFetch(`/instance/delete/${instanceName}`, { method: "DELETE" });
}

export async function logoutInstance(instanceName: string) {
  return evoFetch(`/instance/logout/${instanceName}`, { method: "DELETE" });
}

export async function restartInstance(instanceName: string) {
  return evoFetch(`/instance/restart/${instanceName}`, { method: "PUT" });
}

export async function recreateInstance(instanceName: string) {
  await logoutInstance(instanceName).catch(() => {});
  await deleteInstance(instanceName).catch(() => {});
  return createInstance(instanceName);
}

// ─── Helpers ───────────────────────────────────────────

function normalizePhone(to: string) {
  return to.replace(/\D/g, "");
}

// ─── Messaging ──────────────────────────────────────────

interface SendMessageResult {
  key: { remoteJid: string; fromMe: boolean; id: string };
  message: Record<string, unknown>;
  messageTimestamp: number;
  status: string;
}

export async function sendText(
  instanceName: string,
  to: string,
  text: string,
) {
  const number = normalizePhone(to);
  if (!number) {
    throw new Error("Numéro WhatsApp requis.");
  }

  return evoFetch<SendMessageResult>(
    `/message/sendText/${instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        number,
        text,
        delay: 500,
        presence: "composing",
      }),
    },
  );
}

export async function sendMedia(
  instanceName: string,
  to: string,
  mediaUrl: string,
  caption: string,
  mediaType: "image" | "video" | "document" = "image",
) {
  const number = normalizePhone(to);
  if (!number) {
    throw new Error("Numéro WhatsApp requis.");
  }

  return evoFetch<SendMessageResult>(
    `/message/sendMedia/${instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        number,
        mediatype: mediaType,
        media: mediaUrl,
        caption,
        fileName: `file.${mediaType === "document" ? "pdf" : mediaType === "video" ? "mp4" : "jpg"}`,
      }),
    },
  );
}

// ─── Webhook ────────────────────────────────────────────

export async function setWebhook(
  instanceName: string,
  webhookUrl: string,
  headers?: Record<string, string>,
) {
  return evoFetch(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      url: webhookUrl,
      // Carrying the inbound secret here keeps it out of the URL, where it would
      // otherwise land in every access log along the way.
      ...(headers ? { headers } : {}),
      events: [
        "SEND_MESSAGE",
        "CONNECTION_UPDATE",
        "MESSAGES_UPSERT",
        "QRCODE_UPDATED",
      ],
      webhook_by_events: false,
      webhook_base64: false,
    }),
  });
}

// ─── Helpers ────────────────────────────────────────────

export function isConfigured() {
  return !!(EVO_URL && EVO_KEY);
}

export class BaileysProvider implements IWhatsAppProvider {
  constructor(private instanceName: string) {}

  async sendText(to: string, text: string): Promise<WhatsAppSendResult> {
    try {
      const result = await sendText(this.instanceName, to, text);
      return {
        success: true,
        messageId: result.key.id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown Baileys error",
      };
    }
  }

  async sendTemplate(): Promise<WhatsAppSendResult> {
    return {
      success: false,
      error: "Les templates WhatsApp approuvés sont disponibles uniquement via Meta Cloud API.",
    };
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult> {
    try {
      const result = await sendMedia(this.instanceName, to, imageUrl, caption ?? "", "image");
      return {
        success: true,
        messageId: result.key.id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown Baileys error",
      };
    }
  }
}
