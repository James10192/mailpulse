// The rules of outbound webhook delivery, kept free of any I/O so that each one
// can be read and tested on its own: what is retried, when, how a URL is
// judged safe to call, and how a request is signed during a secret rotation.

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/** Waits between attempts: after the 1st failure, the 2nd, ... Then the delivery fails for good. */
export const WEBHOOK_RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 6 * 60 * 60_000] as const;
export const WEBHOOK_MAX_ATTEMPTS = WEBHOOK_RETRY_DELAYS_MS.length + 1;
export const WEBHOOK_TIMEOUT_MS = 10_000;
/** A claimed delivery left behind by a crashed run becomes claimable again after this. */
export const WEBHOOK_LEASE_MS = 5 * 60_000;
/** How long the previous secret keeps signing after a rotation. */
export const WEBHOOK_SECRET_OVERLAP_MS = 24 * 60 * 60_000;

export type AttemptResult =
  | { kind: "delivered" }
  | { kind: "http"; status: number }
  | { kind: "timeout" }
  | { kind: "network" }
  | { kind: "blocked"; reason: string };

/** Network trouble, timeouts, 408, 429 and 5xx may pass later; any other refusal will not. */
export function isRetryable(result: AttemptResult) {
  if (result.kind === "timeout" || result.kind === "network") return true;
  if (result.kind !== "http") return false;
  return result.status === 408 || result.status === 429 || result.status >= 500;
}

/** What the log shows: a classified reading, never a raw error text. */
export function describeAttempt(result: AttemptResult): string | null {
  switch (result.kind) {
    case "delivered":
      return null;
    case "http":
      return result.status >= 300 && result.status < 400 ? `HTTP ${result.status} (redirection non suivie)` : `HTTP ${result.status}`;
    case "timeout":
      return `Délai dépassé (${WEBHOOK_TIMEOUT_MS / 1000} s)`;
    case "network":
      return "Connexion impossible";
    case "blocked":
      return result.reason;
  }
}

export type DeliveryDecision =
  | { status: "DELIVERED"; nextRetryAt: null }
  | { status: "RETRYING"; nextRetryAt: Date }
  | { status: "FAILED"; nextRetryAt: null };

/** `attempts` counts the attempt that just ended. */
export function decideAfterAttempt(result: AttemptResult, attempts: number, now: Date): DeliveryDecision {
  if (result.kind === "delivered") return { status: "DELIVERED", nextRetryAt: null };
  if (!isRetryable(result) || attempts >= WEBHOOK_MAX_ATTEMPTS) return { status: "FAILED", nextRetryAt: null };
  const delay = WEBHOOK_RETRY_DELAYS_MS[Math.min(attempts, WEBHOOK_RETRY_DELAYS_MS.length) - 1];
  return { status: "RETRYING", nextRetryAt: new Date(now.getTime() + delay) };
}

// ---------------------------------------------------------------------------
// Destination safety. A webhook URL is chosen by the customer and called from
// our servers: it must not reach our own network, a cloud metadata service or
// a private address. Checked at creation and again before every call.

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal", "metadata"]);
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home.arpa"];

function privateIPv4(address: string) {
  const [a, b] = address.split(".").map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

function privateIPv6(address: string) {
  const value = address.toLowerCase();
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("::ffff:")) {
    const mapped = value.slice(7);
    return isIP(mapped) === 4 ? privateIPv4(mapped) : true;
  }
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(value);
}

export function isPrivateAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return privateIPv4(address);
  if (version === 6) return privateIPv6(address);
  return false;
}

/** Null when the URL may be called; otherwise why not, in French. */
export function webhookUrlProblem(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Adresse invalide";
  }
  if (url.protocol !== "https:") return "L'adresse doit être en HTTPS";
  if (url.username || url.password) return "L'adresse ne doit pas contenir d'identifiants";
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    return "Adresse interne refusée";
  }
  if (isPrivateAddress(hostname)) return "Adresse privée refusée";
  if (!isIP(hostname) && !hostname.includes(".")) return "Adresse interne refusée";
  return null;
}

// ---------------------------------------------------------------------------
// Signature

export type SigningSecrets = { current: string; previous: string | null; previousExpiresAt: Date | null };

/**
 * `v1=<signature>` with the current secret. During the overlap after a
 * rotation, the previous secret signs too: `v1=<new>,v1=<old>`. A receiver
 * accepts the request if any of the listed signatures matches its secret.
 */
export function signatureHeader(secrets: SigningSecrets, timestamp: string, body: string, now: Date) {
  const sign = (secret: string) => `v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
  const signatures = [sign(secrets.current)];
  if (secrets.previous && secrets.previousExpiresAt && secrets.previousExpiresAt > now) signatures.push(sign(secrets.previous));
  return signatures.join(",");
}
