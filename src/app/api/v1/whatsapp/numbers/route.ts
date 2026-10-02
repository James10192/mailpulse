import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { APPLICATION_WHATSAPP_ACCOUNTS, chooseWhatsAppSender, senderAccountLabel } from "@/lib/messaging/whatsapp-sender";
import { prisma } from "@/lib/prisma";

/**
 * The WhatsApp numbers a key may name in `sender_id`: its application's, never
 * another application's. A key with no application has none to name; its
 * messages leave from the organization's number.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });
  if (!auth.applicationId) return Response.json({ numbers: [], default_sender_id: null });

  const accounts = await prisma.providerAccount.findMany({
    where: { organizationId: auth.organizationId, applicationId: auth.applicationId, ...APPLICATION_WHATSAPP_ACCOUNTS.where },
    orderBy: { createdAt: "asc" },
    select: APPLICATION_WHATSAPP_ACCOUNTS.select,
  });
  const chosen = chooseWhatsAppSender(accounts);

  return Response.json({
    numbers: accounts.map((account) => ({
      id: account.id,
      label: senderAccountLabel(account),
      transport: account.provider === "META_WHATSAPP" ? "meta" : "whatsapp_web",
      active: account.active,
      default: chosen.kind === "account" && chosen.account.id === account.id,
    })),
    default_sender_id: chosen.kind === "account" ? chosen.account.id : null,
  });
}
