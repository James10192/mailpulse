import { receiveMetaWebhookRequest, verifyMetaWebhookRequest } from "@/lib/external-applications/meta-webhook";

export const runtime = "nodejs";

/** Temporary compatibility route. Remove after Meta uses the application-scoped URL. */
export async function GET(request: Request) {
  const applicationKey = process.env.LEGACY_EXTERNAL_APPLICATION_KEY;
  if (!applicationKey) return new Response("Forbidden", { status: 403 });
  return verifyMetaWebhookRequest(request, applicationKey);
}

export async function POST(request: Request) {
  return receiveMetaWebhookRequest(request);
}
