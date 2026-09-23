import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { validationError } from "@/lib/mailpulse/schemas";
import { prisma } from "@/lib/prisma";
import { checkVerificationSchema, errorResponse, refusedCheckBody, verificationSecretOrResponse } from "@/lib/verifications/api";
import { checkVerification } from "@/lib/verifications/service";
import { createPrismaVerificationStore } from "@/lib/verifications/store";

const store = createPrismaVerificationStore(prisma);

export async function POST(request: Request, context: { params: Promise<{ verificationId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = checkVerificationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const secret = verificationSecretOrResponse();
  if (secret instanceof Response) return secret;

  const { verificationId } = await context.params;
  try {
    const result = await checkVerification({ store, now: () => new Date(), secret }, { organizationId: auth.organizationId, id: verificationId, code: parsed.data.code });
    if (result.type === "not_found") return errorResponse("verification_introuvable", 404);
    if (result.type === "approved") return Response.json({ id: result.id, status: "approved" });
    return Response.json(refusedCheckBody(result.id, result.status), { status: 422 });
  } catch (error) {
    console.error("[verifications] check failed", { organizationId: auth.organizationId, error: error instanceof Error ? error.message : error });
    return errorResponse("erreur_interne", 500);
  }
}
