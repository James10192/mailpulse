import { z } from "zod";

import { resolveCommandCredential, resolveExternalApplication } from "@/lib/external-applications/application";
import { dispatchExternalApplicationCommand } from "@/lib/external-applications/commands";
import { decryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import { hasValidVersionedSignature, isFreshExternalApplicationTimestamp, parseVersionedSignature } from "@/lib/external-applications/signatures";

const commandSchema = z.object({
  operation_key: z.string().trim().min(1).max(128),
  channel: z.literal("whatsapp"),
  recipient: z.object({ type: z.literal("phone"), value: z.string().regex(/^\+[1-9]\d{6,14}$/) }).strict(),
  content: z.discriminatedUnion("type", [
    z.object({ type: z.literal("text"), text: z.string().trim().min(1).max(500) }).strict(),
    z.object({ type: z.literal("template"), locale: z.string().trim().min(2).max(20), parameters: z.array(z.string().trim().min(1).max(512)).max(10).default([]) }).strict(),
  ]),
  metadata: z.object({ idempotency_key: z.string().trim().min(1).max(128) }).strict(),
}).strict();

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ applicationKey: string }> }) {
  const rawBody = await request.text();
  const organizationId = request.headers.get("x-external-organization-id");
  const { applicationKey } = await context.params;
  const signature = request.headers.get("x-external-signature");
  const timestamp = request.headers.get("x-external-timestamp");
  const parsedSignature = parseVersionedSignature(signature);
  if (!organizationId || !parsedSignature || !isFreshExternalApplicationTimestamp(timestamp)) return new Response("Unauthorized", { status: 401 });

  const application = await resolveExternalApplication(organizationId, applicationKey);
  if (!application) return new Response("Unauthorized", { status: 401 });
  const credential = await resolveCommandCredential(application.id, parsedSignature.keyId);
  if (!credential) return new Response("Unauthorized", { status: 401 });

  let secret: string;
  try {
    secret = decryptExternalApplicationValue(credential.secretCiphertext);
  } catch {
    return new Response("Service unavailable", { status: 503 });
  }
  if (!hasValidVersionedSignature(signature, credential.keyId, secret, timestamp!, rawBody)) return new Response("Unauthorized", { status: 401 });

  const parsed = commandSchema.safeParse(parseJson(rawBody));
  if (!parsed.success) return Response.json({ error: "Invalid payload" }, { status: 400 });
  let result;
  try {
    result = await dispatchExternalApplicationCommand(application, normalizeCommand(parsed.data));
  } catch {
    return new Response("Service unavailable", { status: 503 });
  }
  if (result.status === "accepted") return Response.json({ accepted: true, operation_id: result.operationId, dispatch_state: "accepted", reconciliation_required: false }, { status: 202 });
  if (result.status === "submission_unknown") return Response.json({ accepted: false, operation_id: result.operationId, dispatch_state: "pending_reconciliation", reconciliation_required: true }, { status: 202 });
  if (result.status === "rejected") return Response.json({ accepted: false, operation_id: result.operationId, dispatch_state: "rejected", rejection_code: result.rejectionCode ?? "provider_rejected", reconciliation_required: false }, { status: 422 });
  if (result.status === "conflict") return new Response("Conflicting idempotency payload", { status: 409 });
  return new Response("Upstream service unavailable", { status: result.status === "in_progress" ? 409 : 503 });
}

function normalizeCommand(input: z.infer<typeof commandSchema>) {
  return {
    operationKey: input.operation_key,
    idempotencyKey: input.metadata.idempotency_key,
    recipient: input.recipient.value,
    content: input.content.type === "text"
      ? { type: "text" as const, text: input.content.text }
      : { type: "template" as const, locale: input.content.locale, parameters: input.content.parameters },
  };
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
