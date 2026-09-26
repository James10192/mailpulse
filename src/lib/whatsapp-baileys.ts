// Evolution API client — REST wrapper for Baileys WhatsApp sessions
// Docs: https://doc.evolution-api.com

import { retryAfterSeconds } from "@/lib/http-status";
import { EVOLUTION_DEFAULT_TIMEOUT_MS, sendTimeoutMs, typingDelayMs, type BaileysSendPriority } from "@/lib/whatsapp/baileys-typing";
import { EvolutionApiError, evolutionApiError, isEvolutionInstanceMissing } from "@/lib/whatsapp/evolution-error";
import { isTimeoutError, statusFailureReason, type IWhatsAppProvider, type WhatsAppFailureReason, type WhatsAppSendResult } from "@/lib/whatsapp/types";

export { EvolutionApiError };
export type { BaileysSendPriority };

const EVO_URL = process.env.EVOLUTION_API_URL || "";
const EVO_KEY = process.env.EVOLUTION_API_KEY || "";

async function evoFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  timeoutMs: number = EVOLUTION_DEFAULT_TIMEOUT_MS,
): Promise<T> {
  if (!EVO_URL || !EVO_KEY) {
    throw new Error("Evolution API non configurée.");
  }

  // The api key and every recipient phone number and message body travel in this
  // request. Plain HTTP would put them, and the key that controls every client
  // session, on the wire in clear.
  if (process.env.NODE_ENV === "production" && !EVO_URL.startsWith("https://")) {
    throw new Error("EVOLUTION_API_URL doit etre en HTTPS en production.");
  }

  const res = await fetch(`${EVO_URL}${path}`, {
    ...options,
    // Evolution proxies a WhatsApp Web session that can hang through a
    // reconnection, and the caller holds a lease while it waits.
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "Content-Type": "application/json",
      apikey: EVO_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw evolutionApiError(res.status, body, retryAfterSeconds(res.headers));
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

type SessionState = "open" | "close" | "connecting";

interface ConnectionState {
  instance?: {
    instanceName?: string;
    state?: unknown;
  };
  instanceName?: string;
  state?: unknown;
}

function isSessionState(value: unknown): value is SessionState {
  return value === "open" || value === "close" || value === "connecting";
}

/**
 * Throws unless Evolution itself answered with a session state. A page served
 * by anything else in front of it (a wrong DNS answer, a proxy error page) is
 * not a state, and reading it as "close" would record a healthy session as down.
 */
export async function getConnectionState(instanceName: string) {
  const result = await evoFetch<ConnectionState | string>(
    `/instance/connectionState/${instanceName}`,
  );
  const answer = typeof result === "object" ? result : {};
  const state = answer.instance?.state ?? answer.state;
  if (!isSessionState(state)) {
    throw new Error("Réponse inattendue du serveur WhatsApp : l'état de la session est illisible.");
  }

  return {
    instanceName: answer.instance?.instanceName ?? answer.instanceName ?? instanceName,
    state,
  };
}

/**
 * - state: Evolution answered with the session state.
 * - missing: Evolution itself says this instance does not exist. The only
 *   outcome that justifies creating a new one.
 * - unreachable: anything else (network error, timeout, 5xx, a non-Evolution
 *   response). Says nothing about the session, which must be left untouched.
 */
export type InstanceProbe =
  | { kind: "state"; state: SessionState }
  | { kind: "missing" }
  | { kind: "unreachable"; error: string };

export async function probeInstance(instanceName: string): Promise<InstanceProbe> {
  try {
    const { state } = await getConnectionState(instanceName);
    return { kind: "state", state };
  } catch (error) {
    if (isEvolutionInstanceMissing(error, instanceName)) return { kind: "missing" };
    return { kind: "unreachable", error: error instanceof Error ? error.message : "Serveur WhatsApp injoignable." };
  }
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

// ─── Helpers ───────────────────────────────────────────

function normalizePhone(to: string) {
  const number = to.replace(/\D/g, "");
  if (!number) {
    throw new Error("Numéro WhatsApp requis.");
  }
  return number;
}

// ─── Messaging ──────────────────────────────────────────

interface SendMessageResult {
  key: { remoteJid: string; fromMe: boolean; id: string };
  message: Record<string, unknown>;
  messageTimestamp: number;
  status: string;
}

export type BaileysSendOptions = {
  /** Default "bulk". See `BaileysSendPriority`. */
  priority?: BaileysSendPriority;
  /** Source of randomness for the typing delay, in [0, 1). */
  random?: () => number;
};

/**
 * Posts a send with a simulated typing delay sized on the visible text, and a
 * timeout that outlasts it: Evolution only answers once the delay is over.
 */
function postMessage(path: string, body: Record<string, unknown>, visibleText: string, options: BaileysSendOptions) {
  const delay = typingDelayMs(visibleText.length, options.priority ?? "bulk", options.random);
  return evoFetch<SendMessageResult>(
    path,
    { method: "POST", body: JSON.stringify({ ...body, delay }) },
    sendTimeoutMs(delay),
  );
}

export async function sendText(
  instanceName: string,
  to: string,
  text: string,
  options: BaileysSendOptions = {},
) {
  return postMessage(
    `/message/sendText/${instanceName}`,
    // Without `linkPreview: false`, Evolution fetches every URL of the text
    // from its own IP to build a preview, which no human sender does.
    { number: normalizePhone(to), text, linkPreview: false },
    text,
    options,
  );
}

export async function sendMedia(
  instanceName: string,
  to: string,
  mediaUrl: string,
  caption: string,
  mediaType: "image" | "video" | "document" = "image",
  options: BaileysSendOptions = {},
) {
  return postMessage(
    `/message/sendMedia/${instanceName}`,
    {
      number: normalizePhone(to),
      mediatype: mediaType,
      media: mediaUrl,
      caption,
      fileName: `file.${mediaType === "document" ? "pdf" : mediaType === "video" ? "mp4" : "jpg"}`,
    },
    caption,
    options,
  );
}

/**
 * A file sent as a WhatsApp document, with its real name and media type. The
 * generic `sendMedia` above guesses both from the media kind, which shows every
 * file as `file.pdf` on the recipient's phone.
 */
export async function sendDocument(
  instanceName: string,
  to: string,
  document: { url: string; filename: string; mimeType: string; caption?: string },
  options: BaileysSendOptions = {},
) {
  return postMessage(
    `/message/sendMedia/${instanceName}`,
    {
      number: normalizePhone(to),
      mediatype: "document",
      mimetype: document.mimeType,
      media: document.url,
      fileName: document.filename,
      ...(document.caption ? { caption: document.caption } : {}),
    },
    document.caption ?? "",
    options,
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
        // Delivery and read acknowledgements of the messages we sent.
        "MESSAGES_UPDATE",
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

/**
 * `reason` says whether anything was sent, nothing more. A rejection can come
 * from a session that was briefly disconnected and a rate limit lifts: it must
 * never be reused as a "do not retry" signal. Retry decisions stay with
 * `EvolutionApiError.deterministic`.
 */
function evolutionFailureReason(error: unknown): WhatsAppFailureReason {
  if (error instanceof EvolutionApiError && error.recipientUnreachable) return "recipient_unreachable";
  if (isTimeoutError(error)) return "timeout";
  if (error instanceof EvolutionApiError) return statusFailureReason(error.status) ?? "transport";
  return "transport";
}

function evolutionFailure(error: unknown) {
  return {
    success: false as const,
    error: error instanceof Error ? error.message : "Unknown Baileys error",
    reason: evolutionFailureReason(error),
    ...(error instanceof EvolutionApiError && error.retryAfterSeconds ? { retryAfterSeconds: error.retryAfterSeconds } : {}),
  };
}

export class BaileysProvider implements IWhatsAppProvider {
  private readonly instanceName: string;
  private readonly options: BaileysSendOptions;

  constructor(instanceName: string, priority: BaileysSendPriority = "bulk") {
    this.instanceName = instanceName;
    this.options = { priority };
  }

  async sendText(to: string, text: string): Promise<WhatsAppSendResult> {
    try {
      const result = await sendText(this.instanceName, to, text, this.options);
      return {
        success: true,
        messageId: result.key.id,
      };
    } catch (err) {
      return evolutionFailure(err);
    }
  }

  async sendTemplate(): Promise<WhatsAppSendResult> {
    return {
      success: false,
      error: "Les templates WhatsApp approuvés sont disponibles uniquement via Meta Cloud API.",
      reason: "rejected",
    };
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<WhatsAppSendResult> {
    try {
      const result = await sendMedia(this.instanceName, to, imageUrl, caption ?? "", "image", this.options);
      return {
        success: true,
        messageId: result.key.id,
      };
    } catch (err) {
      return evolutionFailure(err);
    }
  }
}
