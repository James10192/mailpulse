import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { findIdempotentResponse, idempotentJson } from "@/lib/mailpulse/idempotency";
import {
  createIdempotentCommunicationMessage,
  dispatchIdempotentCommunicationMessage,
  storeIdempotentCommunicationMessageResponse,
} from "@/lib/mailpulse/messages";
import { enforceApiMessageLimits } from "@/lib/mailpulse/delivery-limits";
import { createMessageSchema, toChannel, validationError } from "@/lib/mailpulse/schemas";

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? null;
  if (!idempotencyKey) {
    return Response.json({ error: "Idempotency-Key header is required" }, { status: 400 });
  }
  if (idempotencyKey.length > 255) {
    return Response.json({ error: "Idempotency-Key header is too long" }, { status: 422 });
  }

  const existingClaim = await findIdempotentResponse({
    organizationId: auth.organizationId,
    key: idempotencyKey,
    method: "POST",
    path: "/api/v1/messages",
  });
  if (!existingClaim) {
    const limits = await enforceApiMessageLimits({
      organizationId: auth.organizationId,
      plan: auth.organization.plan,
      channel: toChannel(parsed.data.channel),
    });
    if (!limits.allowed) {
      return Response.json(
        { error: limits.reason === "quota" ? "Monthly email quota exceeded" : "Message rate limit exceeded" },
        { status: 429, headers: { "Retry-After": String(limits.retryAfter) } },
      );
    }
  }

  const result = await createIdempotentCommunicationMessage({
    organizationId: auth.organizationId,
    origin: "API",
    organization: auth.organization,
    input: parsed.data,
    idempotencyKey,
    defaultEmailSenderId: auth.defaultEmailSenderId,
    method: "POST",
    path: "/api/v1/messages",
    requestBody: body,
  });
  if (result.type === "conflict") {
    return Response.json(result.response, { status: result.statusCode });
  }
  const messageId = result.messageId;
  if (!messageId) {
    return idempotentJson(result.response, result.statusCode);
  }

  // The claim is committed before provider dispatch. A replay therefore resumes
  // a still-queued message, while a claimed or terminal message is only observed.
  await dispatchIdempotentCommunicationMessage({
    messageId,
    organizationId: auth.organizationId,
    organization: auth.organization,
    defaultEmailSenderId: auth.defaultEmailSenderId,
  });
  const response = await storeIdempotentCommunicationMessageResponse({
    organizationId: auth.organizationId,
    idempotencyKey,
    method: "POST",
    path: "/api/v1/messages",
    messageId,
  });
  return Response.json(response.response, { status: response.statusCode });
}
