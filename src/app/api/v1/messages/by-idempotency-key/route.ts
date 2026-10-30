import { referenceBelongsToTenant } from "@/lib/mailpulse/announcement-reference";
import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { isAnnouncementLookupMatch } from "@/lib/mailpulse/announcement-message-lookup";
import { DELIVERY_DELAYS_INCLUDE } from "@/lib/mailpulse/message-delivery-delays";
import { prisma } from "@/lib/prisma";

/** Read-only recovery of a lost POST response.
 * Never use POST /messages to "look up" an uncertain outcome: that could send.
 * The SAME API key that originally submitted the email is required.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const tenant = url.searchParams.get("tenant") ?? "";
  if (!referenceBelongsToTenant(key, tenant)
      || key.length > 191 || tenant.trim() !== tenant || tenant.length > 191) {
    return Response.json({ error: "Invalid lookup parameters" }, { status: 422 });
  }

  const message = await prisma.communicationMessage.findFirst({
    where: {
      organizationId: auth.organizationId,
      apiKeyId: auth.id,
      idempotencyKey: key,
      externalTenantId: tenant,
      origin: "API",
      channel: "EMAIL",
    },
    include: DELIVERY_DELAYS_INCLUDE,
  });
  if (!message || !isAnnouncementLookupMatch(message, key, tenant)) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }
  return Response.json({
    message: {
      id: message.id,
      status: message.status.toLowerCase(),
      recipient: { type: "email", value: message.recipientValue },
      external_tenant_id: message.externalTenantId,
      external_reference: key,
      error_code: message.errorCode,
      delivered_at: message.deliveredAt?.toISOString() ?? null,
      delivery_delays: message.events.map((event) => ({ occurred_at: event.occurredAt.toISOString() })),
    },
  });
}
