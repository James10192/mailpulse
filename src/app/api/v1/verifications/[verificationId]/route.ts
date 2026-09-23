import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { prisma } from "@/lib/prisma";
import { errorResponse, serializeVerification } from "@/lib/verifications/api";
import { createPrismaVerificationStore } from "@/lib/verifications/store";

const store = createPrismaVerificationStore(prisma);

export async function GET(request: Request, context: { params: Promise<{ verificationId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const { verificationId } = await context.params;
  // Scoped to the key's organization: another organization's id reads as unknown.
  const verification = await store.find(auth.organizationId, verificationId);
  if (!verification) return errorResponse("verification_introuvable", 404);

  return Response.json(serializeVerification(verification, new Date()));
}
