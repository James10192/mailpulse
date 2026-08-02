import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { findIdempotentResponse, idempotentJson, storeIdempotentResponse } from "@/lib/mailpulse/idempotency";
import { serializeContact } from "@/lib/mailpulse/serializers";
import { updateContactPreferencesSchema, validationError } from "@/lib/mailpulse/schemas";
import { prisma } from "@/lib/prisma";
import { mergeChannelOptIns } from "@/lib/mailpulse/consent";

export async function PATCH(request: Request, context: { params: Promise<{ contactId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const { contactId } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateContactPreferencesSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const idempotencyKey = request.headers.get("idempotency-key");
  const replay = await findIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "PATCH",
    path: `/api/v1/contacts/${contactId}/preferences`,
  });
  if (replay) return idempotentJson(replay.responseBody, replay.statusCode);

  const existing = await prisma.contact.findFirst({
    where: { id: contactId, organizationId: auth.organizationId },
  });
  if (!existing) return Response.json({ error: "Contact not found" }, { status: 404 });

  const previousMetadata =
    existing.metadata && typeof existing.metadata === "object" && !Array.isArray(existing.metadata)
      ? (existing.metadata as Record<string, unknown>)
      : {};
  const contact = await prisma.contact.update({
    where: { id: existing.id },
    data: {
      subscribed: parsed.data.subscribed ?? existing.subscribed,
      metadata: {
        ...mergeChannelOptIns(previousMetadata, parsed.data.channel_opt_in ?? {}),
        ...(parsed.data.metadata ?? {}),
        ...(parsed.data.preferred_channel ? { preferred_channel: parsed.data.preferred_channel } : {}),
        ...(parsed.data.language ? { language: parsed.data.language } : {}),
      },
    },
  });

  const response = { contact: serializeContact(contact) };
  await storeIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "PATCH",
    path: `/api/v1/contacts/${contactId}/preferences`,
    requestBody: body,
    statusCode: 200,
    responseBody: response,
  });

  return Response.json(response);
}
