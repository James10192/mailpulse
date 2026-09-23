import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { DELIVERY_DELAYS_INCLUDE } from "@/lib/mailpulse/message-delivery-delays";
import { serializeMessageDetail } from "@/lib/mailpulse/serializers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ messageId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const { messageId } = await context.params;
  const message = await prisma.communicationMessage.findFirst({
    where: { id: messageId, organizationId: auth.organizationId },
    include: DELIVERY_DELAYS_INCLUDE,
  });

  if (!message) return Response.json({ error: "Message not found" }, { status: 404 });
  const { events, ...fields } = message;
  return Response.json({ message: serializeMessageDetail(fields, events) });
}
