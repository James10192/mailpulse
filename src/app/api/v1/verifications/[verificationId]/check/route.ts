import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { validationError } from "@/lib/mailpulse/schemas";
import { checkVerification } from "@/lib/verifications/check";
import { verificationDeps } from "@/lib/verifications/deps";
import { checkVerificationSchema, errorResponse, refusedCheckBody } from "@/lib/verifications/http";

export async function POST(request: Request, context: { params: Promise<{ verificationId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = checkVerificationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const deps = verificationDeps();
  if (!deps) {
    console.error("[verifications] VERIFICATION_CODE_SECRET is missing or shorter than 32 characters");
    return errorResponse("verification_indisponible", 503);
  }

  const { verificationId } = await context.params;
  try {
    const result = await checkVerification(deps, { organizationId: auth.organizationId, id: verificationId, code: parsed.data.code });
    if (result.type === "not_found") return errorResponse("verification_introuvable", 404);
    if (result.type === "approved") return Response.json({ id: result.id, status: "approved" });
    return Response.json(refusedCheckBody(result.id, result.status), { status: 422 });
  } catch (error) {
    console.error("[verifications] check failed", { organizationId: auth.organizationId, error: error instanceof Error ? error.message : error });
    return errorResponse("erreur_interne", 500);
  }
}
