import { receiveMetaWebhookRequest, verifyMetaWebhookRequest } from "@/lib/external-applications/meta-webhook";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ applicationKey: string }> }) {
  const { applicationKey } = await context.params;
  return verifyMetaWebhookRequest(request, applicationKey);
}

export async function POST(request: Request, context: { params: Promise<{ applicationKey: string }> }) {
  const { applicationKey } = await context.params;
  return receiveMetaWebhookRequest(request, applicationKey);
}
