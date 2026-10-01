import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";
import { prisma } from "@/lib/prisma";
import { serializeWebhook } from "@/lib/mailpulse/serializers";
import { rotateWebhookSecret } from "@/lib/mailpulse/webhooks";

/**
 * A new signing secret, returned once. For 24 hours, deliveries carry a
 * signature made with each secret, so the receiver can switch at its pace.
 */
export async function POST(request: Request, context: { params: Promise<{ webhookId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const organization = await prisma.organization.findUnique({ where: { id: auth.organizationId }, select: { plan: true } });
  if (!organization || !canAccessFeature(organization.plan as PlanTier, "webhooks")) {
    return Response.json({ error: "Webhooks are not included in your plan" }, { status: 403 });
  }

  const { webhookId } = await context.params;
  const rotated = await rotateWebhookSecret(auth.organizationId, webhookId);
  if (!rotated) return Response.json({ error: "Webhook not found" }, { status: 404 });
  if ("conflict" in rotated) return Response.json({ error: "Another rotation is in progress, retry" }, { status: 409 });

  return Response.json({ webhook: serializeWebhook(rotated.endpoint), signing_secret: rotated.secret });
}
