import crypto from "node:crypto";

/**
 * One-time codes: generated from the CSPRNG, stored only as a salted HMAC and
 * compared in constant time. Dependency-free so the Node test runner loads it.
 */

export const VERIFICATION_CODE_LENGTH = 6;
const HASH_VERSION = "v1";
const MIN_SECRET_LENGTH = 32;

export function generateVerificationCode() {
  // randomInt draws uniformly, so no leading-zero or modulo bias.
  return crypto.randomInt(0, 10 ** VERIFICATION_CODE_LENGTH).toString().padStart(VERIFICATION_CODE_LENGTH, "0");
}

function hmac(secret: string, salt: string, code: string) {
  return crypto.createHmac("sha256", secret).update(`${salt}:${code}`).digest("base64url");
}

/**
 * The per-row salt keeps two identical codes from producing identical hashes;
 * the server secret keeps a leaked table from being brute-forced over the
 * million possible codes.
 */
export function hashVerificationCode(secret: string, code: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  return `${HASH_VERSION}.${salt}.${hmac(secret, salt, code)}`;
}

export function verificationCodeMatches(secret: string, code: string, stored: string) {
  const [version, salt, digest] = stored.split(".");
  if (version !== HASH_VERSION || !salt || !digest) return false;

  const expected = Buffer.from(digest);
  const actual = Buffer.from(hmac(secret, salt, code));
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Null when the secret is missing or too short: the API must then fail closed. */
export function readVerificationSecret(env: Record<string, string | undefined>) {
  const secret = env.VERIFICATION_CODE_SECRET?.trim() ?? "";
  return secret.length >= MIN_SECRET_LENGTH ? secret : null;
}
