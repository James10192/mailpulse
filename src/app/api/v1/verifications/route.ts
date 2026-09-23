import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { validationError } from "@/lib/mailpulse/schemas";
import { prisma } from "@/lib/prisma";
import { errorResponse, startVerificationResponse, startVerificationSchema, verificationSecretOrResponse } from "@/lib/verifications/api";
import { startVerification } from "@/lib/verifications/service";
import { createPrismaVerificationStore } from "@/lib/verifications/store";
import { canSendVerificationCodes, whatsAppVerificationTransport } from "@/lib/verifications/transport";

const store = createPrismaVerificationStore(prisma);

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = startVerificationSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const secret = verificationSecretOrResponse();
  if (secret instanceof Response) return secret;
  if (!canSendVerificationCodes(auth.organization)) return errorResponse("whatsapp_indisponible", 409);

  try {
    const result = await startVerification({ store, now: () => new Date(), secret }, {
      organizationId: auth.organizationId,
      apiKeyId: auth.id,
      phoneNumber: parsed.data.to,
      locale: parsed.data.locale ?? "fr",
      reference: parsed.data.reference ?? null,
      transport: whatsAppVerificationTransport(auth.organization),
    });

    return startVerificationResponse(result, new Date());
  } catch (error) {
    console.error("[verifications] start failed", { organizationId: auth.organizationId, error: error instanceof Error ? error.message : error });
    return errorResponse("erreur_interne", 500);
  }
}
