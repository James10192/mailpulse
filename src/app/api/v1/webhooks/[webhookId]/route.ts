import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, context: { params: Promise<{ webhookId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const { webhookId } = await context.params;
  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: { id: webhookId, organizationId: auth.organizationId },
  });

  if (!endpoint) return Response.json({ error: "Webhook not found" }, { status: 404 });

  await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: { active: false },
  });

  return Response.json({ deleted: true });
}
