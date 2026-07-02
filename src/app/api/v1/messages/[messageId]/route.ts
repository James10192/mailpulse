import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { serializeMessage } from "@/lib/mailpulse/serializers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ messageId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const { messageId } = await context.params;
  const message = await prisma.communicationMessage.findFirst({
    where: { id: messageId, organizationId: auth.organizationId },
  });

  if (!message) return Response.json({ error: "Message not found" }, { status: 404 });
  return Response.json({ message: serializeMessage(message) });
}
