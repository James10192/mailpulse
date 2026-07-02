import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { serializeMessage } from "@/lib/mailpulse/serializers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ conversationId: string }> }) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const { conversationId } = await context.params;
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, organizationId: auth.organizationId },
    select: { id: true },
  });
  if (!conversation) return Response.json({ error: "Conversation not found" }, { status: 404 });

  const messages = await prisma.communicationMessage.findMany({
    where: { conversationId, organizationId: auth.organizationId },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return Response.json({ messages: messages.map(serializeMessage) });
}
