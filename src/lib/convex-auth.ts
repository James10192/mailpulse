import { SignJWT, importJWK, type JWK } from "jose";
import {
  CONVEX_ROLE_MEMBER,
  CONVEX_ROLE_SERVER,
  CONVEX_TOKEN_AUDIENCE,
  CONVEX_TOKEN_ISSUER,
} from "../../convex/authIdentity";

/**
 * Tokens MailPulse signs so that Convex knows who is calling. Convex holds the
 * public key (MAILPULSE_CONVEX_JWKS); the private one stays here
 * (MAILPULSE_CONVEX_PRIVATE_JWK, an ES256 JWK with a `kid`).
 */
export const MEMBER_TOKEN_TTL_SECONDS = 10 * 60;
export const SERVER_TOKEN_TTL_SECONDS = 5 * 60;
export const SERVER_SUBJECT = "mailpulse-server";

type SigningKey = { key: CryptoKey | Uint8Array; kid: string };

let signingKey: Promise<SigningKey> | null = null;

async function loadSigningKey(raw = process.env.MAILPULSE_CONVEX_PRIVATE_JWK): Promise<SigningKey> {
  if (!raw) throw new Error("MAILPULSE_CONVEX_PRIVATE_JWK is not set.");
  const jwk = JSON.parse(raw) as JWK;
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.d || !jwk.kid) {
    throw new Error("MAILPULSE_CONVEX_PRIVATE_JWK must be a private P-256 JWK with a kid.");
  }
  return { key: await importJWK(jwk, "ES256"), kid: jwk.kid };
}

function currentSigningKey() {
  signingKey ??= loadSigningKey().catch((error) => {
    signingKey = null;
    throw error;
  });
  return signingKey;
}

export type ConvexToken = { token: string; expiresAt: number };

async function sign(
  subject: string,
  claims: Record<string, string>,
  ttlSeconds: number,
  now = Date.now(),
): Promise<ConvexToken> {
  const { key, kid } = await currentSigningKey();
  const issuedAt = Math.floor(now / 1000);
  const token = await new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256", kid, typ: "JWT" })
    .setIssuer(CONVEX_TOKEN_ISSUER)
    .setAudience(CONVEX_TOKEN_AUDIENCE)
    .setSubject(subject)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ttlSeconds)
    .sign(key);
  return { token, expiresAt: (issuedAt + ttlSeconds) * 1000 };
}

/** A member of one organization, as resolved by the dashboard. */
export function signMemberToken(member: { userId: string; organizationId: string; name: string }, now?: number) {
  return sign(
    member.userId,
    { role: CONVEX_ROLE_MEMBER, org: member.organizationId, name: member.name },
    MEMBER_TOKEN_TTL_SECONDS,
    now,
  );
}

/** The MailPulse server itself: the only caller allowed to write stats, activity and the message mirror. */
export function signServerToken(now?: number) {
  return sign(SERVER_SUBJECT, { role: CONVEX_ROLE_SERVER }, SERVER_TOKEN_TTL_SECONDS, now);
}

export const __test = { loadSigningKey, reset: () => { signingKey = null; } };
