// Evolution API client — REST wrapper for Baileys WhatsApp sessions
// Docs: https://doc.evolution-api.com

import type { IWhatsAppProvider, WhatsAppSendResult } from "@/lib/whatsapp/types";

const EVO_URL = process.env.EVOLUTION_API_URL || "";
const EVO_KEY = process.env.EVOLUTION_API_KEY || "";

async function evoFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${EVO_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      apikey: EVO_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Evolution API ${res.status}: ${body}`);
  }

  return res.json() as Promise<T>;
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
      syncFullHistory: false,
    }),
  });
}

interface ConnectResult {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export async function getQrCode(instanceName: string) {
  return evoFetch<ConnectResult>(
    `/instance/connect/${instanceName}`,
  );
}

interface ConnectionState {
  instanceName: string;
  state: "open" | "close" | "connecting";
}

export async function getConnectionState(instanceName: string) {
  return evoFetch<ConnectionState>(
    `/instance/connectionState/${instanceName}`,
  );
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

// ─── Helpers ───────────────────────────────────────────

function normalizePhone(to: string) {
  return to.replace(/^\+/, "").replace(/\s/g, "");
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

  return evoFetch<SendMessageResult>(
    `/message/sendText/${instanceName}`,
    {
      method: "POST",
      body: JSON.stringify({
        number,
        textMessage: { text },
        options: { delay: 500, presence: "composing" },
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
  const number = to.replace(/^\+/, "").replace(/\s/g, "");

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
) {
  return evoFetch(`/webhook/set/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({
      url: webhookUrl,
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

// ─── IWhatsAppProvider implementation ──────────────────

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
}
