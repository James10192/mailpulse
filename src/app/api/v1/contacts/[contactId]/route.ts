import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { serializeContact } from "@/lib/mailpulse/serializers";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: { params: Promise<{ contactId: string }> }) {
  const auth = await authenticateApiRequest(_request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const { contactId } = await context.params;
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId: auth.organizationId },
  });

  if (!contact) return Response.json({ error: "Contact not found" }, { status: 404 });
  return Response.json({ contact: serializeContact(contact) });
}
