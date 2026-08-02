import { GET as verifyExternalMetaWebhook, receiveMetaWebhookRequest } from "@/app/api/webhooks/whatsapp/meta/[applicationKey]/route";

export const runtime = "nodejs";

/** Temporary compatibility route. Remove after Meta uses the application-scoped URL. */
export async function GET(request: Request) {
  const applicationKey = process.env.LEGACY_EXTERNAL_APPLICATION_KEY;
  if (!applicationKey) return new Response("Forbidden", { status: 403 });
  return verifyExternalMetaWebhook(request, { params: Promise.resolve({ applicationKey }) });
}

export async function POST(request: Request) {
  return receiveMetaWebhookRequest(request);
}
