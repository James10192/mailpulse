import { z } from "zod";
import type { PhoneVerification, PhoneVerificationStatus } from "@/generated/prisma";
import { maskE164, parseStrictE164 } from "@/lib/phone-numbers";
import { VERIFICATION_CODE_LENGTH, readVerificationSecret } from "./code";
import { VERIFICATION_LOCALES, checkErrorCode, effectiveStatus, publicStatus } from "./policy";
import type { StartVerificationResult } from "./service";

/** HTTP surface of /api/v1/verifications: bodies, responses, configuration guard. */

export const startVerificationSchema = z.object({
  channel: z.literal("whatsapp"),
  to: z.string().transform((value, ctx) => {
    const parsed = parseStrictE164(value);
    if (!parsed) {
      ctx.addIssue({ code: "custom", message: "Numéro international attendu, par exemple +2250700000000." });
      return z.NEVER;
    }
    return parsed.e164;
  }),
  locale: z.enum(VERIFICATION_LOCALES).optional(),
  reference: z.string().trim().min(1).max(191).optional(),
});

export const checkVerificationSchema = z.object({
  code: z.string().regex(new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`), "Le code comporte 6 chiffres."),
});

export function serializeVerification(verification: PhoneVerification, now: Date) {
  return {
    id: verification.id,
    status: publicStatus(effectiveStatus(verification, now)),
    channel: "whatsapp" as const,
    to_masked: maskE164(verification.phoneNumber),
    reference: verification.reference,
    expires_at: verification.expiresAt.toISOString(),
    created_at: verification.createdAt.toISOString(),
    approved_at: verification.approvedAt?.toISOString() ?? null,
  };
}

export function refusedCheckBody(id: string, status: PhoneVerificationStatus) {
  return { id, status: publicStatus(status), error: checkErrorCode(status) };
}

/**
 * 201 whenever a code may have reached the phone, including after a timeout:
 * the verification stays pending and a late code still works. When nothing was
 * sent: 503 if the provider was rate limiting (retry later, with its own
 * Retry-After when it gave one), 502 for a refusal.
 */
export function startVerificationResponse(result: StartVerificationResult, now: Date) {
  if (result.type === "rate_limited" || result.type === "busy") {
    const retryAfter = result.retryAfterSeconds;
    return errorResponse("trop_de_demandes", 429, { retry_after: retryAfter }, { "Retry-After": String(retryAfter) });
  }
  const verification = serializeVerification(result.verification, now);
  if (result.type === "failed" && result.verification.errorCode === "PROVIDER_RATE_LIMITED") {
    const retryAfter = result.retryAfterSeconds;
    return retryAfter
      ? Response.json({ ...verification, error: "whatsapp_sature", retry_after: retryAfter }, { status: 503, headers: { "Retry-After": String(retryAfter) } })
      : Response.json({ ...verification, error: "whatsapp_sature" }, { status: 503 });
  }
  if (result.type === "failed") return Response.json({ ...verification, error: "envoi_echoue" }, { status: 502 });
  return Response.json(verification, { status: 201 });
}

export function errorResponse(error: string, status: number, extra?: Record<string, unknown>, headers?: HeadersInit) {
  return Response.json({ error, ...extra }, { status, headers });
}

/** The hashing secret, or the 503 both endpoints answer when it is not configured. */
export function verificationSecretOrResponse(env: Record<string, string | undefined> = process.env): string | Response {
  const secret = readVerificationSecret(env);
  if (secret) return secret;
  console.error("[verifications] VERIFICATION_CODE_SECRET is missing or shorter than 32 characters");
  return errorResponse("verification_indisponible", 503);
}
