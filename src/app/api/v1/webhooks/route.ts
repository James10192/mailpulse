import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { findIdempotentResponse, idempotentJson, storeIdempotentResponse } from "@/lib/mailpulse/idempotency";
import { serializeWebhook } from "@/lib/mailpulse/serializers";
import { createWebhookSchema, validationError } from "@/lib/mailpulse/schemas";
import { createWebhookEndpoint } from "@/lib/mailpulse/webhooks";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const webhooks = await prisma.webhookEndpoint.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return Response.json({ webhooks: webhooks.map(serializeWebhook) });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createWebhookSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const idempotencyKey = request.headers.get("idempotency-key");
  const replay = await findIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "POST",
    path: "/api/v1/webhooks",
  });
  if (replay) return idempotentJson(replay.responseBody, replay.statusCode);

  const { endpoint, secret } = await createWebhookEndpoint({
    organizationId: auth.organizationId,
    name: parsed.data.name,
    url: parsed.data.url,
    events: parsed.data.events,
  });

  const response = { webhook: serializeWebhook(endpoint), signing_secret: secret };
  await storeIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "POST",
    path: "/api/v1/webhooks",
    requestBody: body,
    statusCode: 201,
    responseBody: response,
  });

  return Response.json(response, { status: 201 });
}
