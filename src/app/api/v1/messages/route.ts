import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { findIdempotentResponse, idempotentJson, storeIdempotentResponse } from "@/lib/mailpulse/idempotency";
import { createCommunicationMessage } from "@/lib/mailpulse/messages";
import { createMessageSchema, validationError } from "@/lib/mailpulse/schemas";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const idempotencyKey = request.headers.get("idempotency-key") ?? parsed.data.idempotency_key ?? null;
  const replay = await findIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "POST",
    path: "/api/v1/messages",
  });
  if (replay) return idempotentJson(replay.responseBody, replay.statusCode);

  const message = await createCommunicationMessage({
    organizationId: auth.organizationId,
    input: parsed.data,
    idempotencyKey,
  });

  const status = message.status === "failed" ? 422 : 202;
  const response = { message };
  await storeIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "POST",
    path: "/api/v1/messages",
    requestBody: body,
    statusCode: status,
    responseBody: response,
  });

  return Response.json(response, { status });
}
