import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { serializeConversation } from "@/lib/mailpulse/serializers";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return Response.json({ conversations: conversations.map(serializeConversation) });
}
