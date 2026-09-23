import { z } from "zod";
import { VERIFICATION_CODE_LENGTH } from "./code";
import { maskPhoneNumber } from "./phone";
import { checkErrorCode, effectiveStatus, publicStatus, type VerificationStatus } from "./policy";
import type { VerificationRecord } from "./types";

/** Request bodies and response shapes of /api/v1/verifications. */

export const startVerificationSchema = z.object({
  channel: z.literal("whatsapp"),
  to: z.string().min(1).max(32),
  locale: z.string().min(2).max(10).optional(),
  reference: z.string().trim().min(1).max(191).optional(),
});

export const checkVerificationSchema = z.object({
  code: z.string().regex(new RegExp(`^\\d{${VERIFICATION_CODE_LENGTH}}$`), "Le code comporte 6 chiffres."),
});

export function serializeVerification(verification: VerificationRecord, now: Date) {
  const status = effectiveStatus(verification, now);
  return {
    id: verification.id,
    status: publicStatus(status),
    channel: "whatsapp" as const,
    to_masked: maskPhoneNumber(verification.phoneNumber),
    reference: verification.reference,
    expires_at: verification.expiresAt.toISOString(),
    created_at: verification.createdAt.toISOString(),
    approved_at: verification.approvedAt?.toISOString() ?? null,
  };
}

export function refusedCheckBody(id: string, status: VerificationStatus) {
  return { id, status: publicStatus(status), error: checkErrorCode(status) };
}

export function errorResponse(error: string, status: number, extra?: Record<string, unknown>, headers?: HeadersInit) {
  return Response.json({ error, ...extra }, { status, headers });
}
