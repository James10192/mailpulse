import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { validationError } from "@/lib/mailpulse/schemas";
import { verificationDeps } from "@/lib/verifications/deps";
import { errorResponse, serializeVerification, startVerificationSchema } from "@/lib/verifications/http";
import { resolveVerificationLocale } from "@/lib/verifications/message";
import { normalizeVerificationPhone } from "@/lib/verifications/phone";
import { startVerification } from "@/lib/verifications/start";
import { isWhatsAppOperational, whatsAppVerificationTransport } from "@/lib/verifications/transport";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = startVerificationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const phone = normalizeVerificationPhone(parsed.data.to);
  if (!phone.ok) {
    return errorResponse("numero_invalide", 422, { field_errors: { to: ["Numéro international attendu, par exemple +2250700000000."] } });
  }

  const deps = verificationDeps();
  if (!deps) {
    console.error("[verifications] VERIFICATION_CODE_SECRET is missing or shorter than 32 characters");
    return errorResponse("verification_indisponible", 503);
  }
  if (!isWhatsAppOperational(auth.organization)) return errorResponse("whatsapp_indisponible", 409);

  try {
    const result = await startVerification(deps, {
      organizationId: auth.organizationId,
      apiKeyId: auth.id,
      phoneNumber: phone.e164,
      locale: resolveVerificationLocale(parsed.data.locale),
      reference: parsed.data.reference ?? null,
      transport: whatsAppVerificationTransport(auth.organization),
    });

    if (result.type === "rate_limited") {
      return errorResponse("trop_de_demandes", 429, { retry_after: result.retryAfterSeconds }, { "Retry-After": String(result.retryAfterSeconds) });
    }
    const verification = serializeVerification(result.verification, deps.now());
    if (result.type === "failed") return Response.json({ ...verification, error: "envoi_echoue" }, { status: 502 });
    return Response.json(verification, { status: 201 });
  } catch (error) {
    console.error("[verifications] start failed", { organizationId: auth.organizationId, error: error instanceof Error ? error.message : error });
    return errorResponse("erreur_interne", 500);
  }
}
