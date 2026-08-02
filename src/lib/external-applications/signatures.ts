import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_VERSION = "v1";
const MAX_REQUEST_AGE_MS = 5 * 60_000;
const MAX_CLOCK_SKEW_MS = 30_000;

export type VersionedSignature = { keyId: string; digest: string };

export function createVersionedSignature(keyId: string, secret: string, timestamp: string, payload: string) {
  return `${SIGNATURE_VERSION}:${keyId}=${createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")}`;
}

export function parseVersionedSignature(value: string | null): VersionedSignature | null {
  if (!value) return null;
  const match = /^v1:([A-Za-z0-9_-]{1,128})=([a-f0-9]{64})$/.exec(value);
  return match ? { keyId: match[1], digest: match[2] } : null;
}

export function hasValidVersionedSignature(signature: string | null, keyId: string, secret: string, timestamp: string, payload: string) {
  const parsed = parseVersionedSignature(signature);
  if (!parsed || parsed.keyId !== keyId) return false;
  const expected = Buffer.from(createVersionedSignature(keyId, secret, timestamp, payload));
  const received = Buffer.from(signature!);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function isFreshExternalApplicationTimestamp(timestamp: string | null, now = Date.now()) {
  if (!timestamp || !/^\d{10}$/.test(timestamp)) return false;
  const requestTime = Number(timestamp) * 1000;
  if (!Number.isSafeInteger(requestTime)) return false;
  const age = now - requestTime;
  return age <= MAX_REQUEST_AGE_MS && age >= -MAX_CLOCK_SKEW_MS;
}

export function hasValidMetaHmac(signature: string | null, appSecret: string, rawBody: string) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature)) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`);
  const received = Buffer.from(signature);
  return received.length === expected.length && timingSafeEqual(received, expected);
}
