import { receiveBaileysWebhookRequest } from "@/lib/external-applications/baileys-webhook";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await context.params;
  return receiveBaileysWebhookRequest(request, applicationId);
}
