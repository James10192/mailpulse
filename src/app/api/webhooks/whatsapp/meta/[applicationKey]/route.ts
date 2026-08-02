import { RequestBodyTooLargeError, getMetaWebhookSenderIds, readBoundedRequestText, receiveMetaWebhook, verifyMetaWebhook } from "@/lib/external-applications/meta-webhook";
import { resolveExternalApplication, resolveExternalApplicationByOpaqueId, resolveMetaApplicationBySenderHmac } from "@/lib/external-applications/application";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ applicationKey: string }> }) {
  const application = await resolveRequestApplication(request, context);
  if (!application) return new Response("Forbidden", { status: 403 });
  const challenge = await verifyMetaWebhook(application, new URL(request.url).searchParams);
  return challenge
    ? new Response(challenge, { status: 200, headers: { "content-type": "text/plain" } })
    : new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request, context: { params: Promise<{ applicationKey: string }> }) {
  const { applicationKey } = await context.params;
  return receiveMetaWebhookRequest(request, applicationKey);
}

async function resolveRequestApplication(request: Request, context: { params: Promise<{ applicationKey: string }> }) {
  const organizationId = request.headers.get("x-external-organization-id");
  const { applicationKey } = await context.params;
  return (await resolveExternalApplicationByOpaqueId(applicationKey))
    ?? (organizationId ? resolveExternalApplication(organizationId, applicationKey) : null);
}

export async function receiveMetaWebhookRequest(request: Request, applicationKey?: string) {
  try {
    const rawBody = await readBoundedRequestText(request.clone());
    const application = applicationKey
      ? await resolveRequestApplicationByKey(request, applicationKey)
      : await resolveBySenderHmac(request, rawBody);
    if (!application) return new Response("Unauthorized", { status: 401 });

    const result = await receiveMetaWebhook(application, request, rawBody);
    return new Response(result.status === 200 ? null : "Webhook unavailable", { status: result.status });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return new Response("Payload too large", { status: 413 });
    return new Response("Service unavailable", { status: 503 });
  }
}

async function resolveRequestApplicationByKey(request: Request, applicationKey: string) {
  const organizationId = request.headers.get("x-external-organization-id");
  return (await resolveExternalApplicationByOpaqueId(applicationKey))
    ?? (organizationId ? resolveExternalApplication(organizationId, applicationKey) : null);
}

async function resolveBySenderHmac(request: Request, rawBody: string) {
  return resolveMetaApplicationBySenderHmac(
    rawBody,
    request.headers.get("x-hub-signature-256"),
    getMetaWebhookSenderIds(rawBody),
  );
}
