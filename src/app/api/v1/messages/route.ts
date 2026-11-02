import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { parseAnnouncementReference } from "@/lib/mailpulse/announcement-reference";
import { precedingAnnouncementReference, priorAttemptPermitsRetry } from "@/lib/mailpulse/announcement-retry-gate";
import { prisma } from "@/lib/prisma";
import { isApplicationNumber } from "@/lib/messaging/whatsapp-sender";
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
  if (parsed.data.sender_id && !await isApplicationNumber(auth.organizationId, auth.applicationId, parsed.data.sender_id)) {
    return Response.json({ error: "sender_id_inconnu" }, { status: 422 });
  }

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
  // A new KLASSCI retry reference cannot be used to evade idempotency:
  // prove that the immediately preceding attempt failed *before* Resend.
  // Never rerun a delivery_delayed, bounce, suppression or unknown outcome.
  // Existing claims replay unchanged, even when the message is now terminal.
  const parsedAnnouncement = parseAnnouncementReference(idempotencyKey);
  if (!existingClaim && parsedAnnouncement?.version === 3) {
    const previousKey = precedingAnnouncementReference(idempotencyKey);
    const metadata = parsed.data.metadata;
    const tenant = parsedAnnouncement.tenant;
    const recipient = parsed.data.recipient.value;

    if (!previousKey || !tenant || parsed.data.channel !== "email"
        || metadata?.source !== "klassci" || metadata?.workflow_event !== "announcement_email"
        || metadata?.external_tenant_id !== tenant
        || metadata?.external_reference !== idempotencyKey
        || metadata?.retry_of !== previousKey) {
      return Response.json({ error: "Retry evidence missing or mismatched", code: "retry_not_authorized" }, { status: 409 });
    }

    const [prior, suppressed] = await Promise.all([
      prisma.communicationMessage.findFirst({
        where: {
          organizationId: auth.organizationId,
          apiKeyId: auth.id,
          idempotencyKey: previousKey,
          externalTenantId: tenant,
          origin: "API",
          channel: "EMAIL",
          recipientType: "EMAIL",
          recipientValue: recipient,
        },
      }),
      prisma.communicationMessage.findFirst({
        where: {
          organizationId: auth.organizationId,
          channel: "EMAIL",
          recipientType: "EMAIL",
          recipientValue: recipient,
          status: "FAILED",
          errorCode: { in: ["email_bounced", "email_complained", "email_suppressed"] },
        },
        select: { id: true },
      }),
    ]);

    if (!priorAttemptPermitsRetry(prior, previousKey, idempotencyKey, tenant, recipient, !!suppressed)) {
      return Response.json({ error: "Previous attempt not proven safe to retry", code: "retry_not_authorized" }, { status: 409 });
    }
  }

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

  // The key's own sender wins, then its application's: a key created under the
  // name of an attached key joins its application and inherits that sender.
  const defaultEmailSenderId = auth.defaultEmailSenderId ?? auth.application?.defaultEmailSenderId ?? null;
  const result = await createIdempotentCommunicationMessage({
    organizationId: auth.organizationId,
    origin: "API",
    organization: auth.organization,
    input: parsed.data,
    idempotencyKey,
    defaultEmailSenderId,
    apiKeyId: auth.id,
    applicationId: auth.applicationId,
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
  // Either way the answer below is recomputed from the message as it is now,
  // never the body stored by the first request.
  await dispatchIdempotentCommunicationMessage({
    messageId,
    organizationId: auth.organizationId,
    organization: auth.organization,
    defaultEmailSenderId,
    replay: result.type === "replay",
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
