// The rules of outbound webhook delivery, kept free of any I/O so that each one
// can be read and tested on its own: what is retried, when, how a URL is
// judged safe to call, and how a request is signed during a secret rotation.

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

/** Waits between attempts: after the 1st failure, the 2nd, ... Then the delivery fails for good. */
export const WEBHOOK_RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 6 * 60 * 60_000] as const;
export const WEBHOOK_MAX_ATTEMPTS = WEBHOOK_RETRY_DELAYS_MS.length + 1;
export const WEBHOOK_TIMEOUT_MS = 10_000;
/** The first attempt runs inside the request that sent the message: kept short. */
export const WEBHOOK_INLINE_TIMEOUT_MS = 3_000;
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
      return "Délai dépassé";
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

/** The eight 16-bit groups of an IPv6 address, an embedded dotted IPv4 tail included. */
function ipv6Groups(address: string): number[] | null {
  let value = address.toLowerCase();
  const tail = value.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (tail) {
    const [a, b, c, d] = tail[1].split(".").map(Number);
    value = `${value.slice(0, -tail[1].length)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head, rest] = value.split("::");
  const left = head ? head.split(":") : [];
  const right = rest !== undefined && rest !== "" ? rest.split(":") : [];
  const missing = 8 - left.length - right.length;
  if (rest === undefined ? left.length !== 8 : missing < 1) return null;
  const groups = [...left, ...Array(rest === undefined ? 0 : missing).fill("0"), ...right].map((group) => Number.parseInt(group, 16));
  return groups.length === 8 && groups.every((group) => Number.isInteger(group) && group >= 0 && group <= 0xffff) ? groups : null;
}

function ipv4From(high: number, low: number) {
  return `${high >> 8}.${high & 0xff}.${low >> 8}.${low & 0xff}`;
}

function privateIPv6(address: string): boolean {
  const groups = ipv6Groups(address);
  if (!groups) return true;
  const zeroPrefix = (count: number) => groups.slice(0, count).every((group) => group === 0);
  // Unspecified and loopback.
  if (zeroPrefix(7) && groups[7] <= 1) return true;
  // Addresses that carry an IPv4 one are judged by it: mapped (::ffff:0:0/96),
  // compatible (::/96), NAT64 (64:ff9b::/96) and 6to4 (2002::/16).
  if (zeroPrefix(5) && groups[5] === 0xffff) return isPrivateAddress(ipv4From(groups[6], groups[7]));
  if (zeroPrefix(6)) return isPrivateAddress(ipv4From(groups[6], groups[7]));
  if (groups[0] === 0x64 && groups[1] === 0xff9b && groups.slice(2, 6).every((group) => group === 0)) return isPrivateAddress(ipv4From(groups[6], groups[7]));
  if (groups[0] === 0x2002) return isPrivateAddress(ipv4From(groups[1], groups[2]));
  // Unique local (fc00::/7), link-local (fe80::/10), site-local (fec0::/10), multicast (ff00::/8).
  return (groups[0] & 0xfe00) === 0xfc00 || (groups[0] & 0xffc0) === 0xfe80 || (groups[0] & 0xffc0) === 0xfec0 || (groups[0] & 0xff00) === 0xff00;
}

export function isPrivateAddress(address: string): boolean {
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
  // A trailing dot names the same host for every resolver: "localhost." is localhost.
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.+$/, "");
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
