import { resolveCommandCredential, resolveExternalApplication } from "@/lib/external-applications/application";
import { parseExternalCommandRequest } from "@/lib/external-applications/command-request";
import { dispatchExternalApplicationCommand } from "@/lib/external-applications/commands";
import { decryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import { hasValidVersionedSignature, isFreshExternalApplicationTimestamp, parseVersionedSignature } from "@/lib/external-applications/signatures";

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

  const command = parseExternalCommandRequest(parseJson(rawBody));
  if (!command) return Response.json({ error: "Invalid payload" }, { status: 400 });
  let result;
  try {
    result = await dispatchExternalApplicationCommand(application, command);
  } catch {
    return new Response("Service unavailable", { status: 503 });
  }
  if (result.status === "accepted") return Response.json({ accepted: true, operation_id: result.operationId, dispatch_state: "accepted", reconciliation_required: false }, { status: 202 });
  if (result.status === "submission_unknown") return Response.json({ accepted: false, operation_id: result.operationId, dispatch_state: "pending_reconciliation", reconciliation_required: true }, { status: 202 });
  if (result.status === "rejected") return Response.json({ accepted: false, operation_id: result.operationId, dispatch_state: "rejected", rejection_code: result.rejectionCode ?? "provider_rejected", reconciliation_required: false }, { status: 422 });
  if (result.status === "consent_pending") return Response.json({ accepted: false, status: "consent_pending", operation_id: result.operationId, operationId: result.operationId, dispatch_state: "consent_pending", reconciliation_required: false }, { status: 202 });
  if (result.status === "queued") return Response.json({ accepted: false, status: "queued", operation_id: result.operationId, operationId: result.operationId, dispatch_state: "queued", reconciliation_required: false }, { status: 202 });
  if (result.status === "consent_refused") return Response.json({ code: "consent_refused", operation_id: result.operationId, operationId: result.operationId }, { status: 409 });
  if (result.status === "conflict") return new Response("Conflicting idempotency payload", { status: 409 });
  return new Response("Upstream service unavailable", { status: result.status === "in_progress" ? 409 : 503 });
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
