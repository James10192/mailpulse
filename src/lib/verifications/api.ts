import { z } from "zod";
import type { PhoneVerification, PhoneVerificationStatus } from "@/generated/prisma";
import { maskE164, parseStrictE164 } from "@/lib/phone-numbers";
import { VERIFICATION_CODE_LENGTH, readVerificationSecret } from "./code";
import { VERIFICATION_LOCALES, checkErrorCode, effectiveStatus, publicStatus } from "./policy";

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
