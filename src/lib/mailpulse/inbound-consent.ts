import { applyStopPreference, type DeliveryChannel } from "@/lib/mailpulse/consent";
import { normalizeContactPhone } from "@/lib/phone-numbers";
import { prisma } from "@/lib/prisma";
import { retryOnSerializationFailure } from "@/lib/prisma-errors";

/**
 * Applies an inbound STOP only to contacts in the sender's organization. The
 * operation is repeatable, which makes duplicate provider deliveries harmless.
 */
export async function applyInboundStopToPhoneContacts(input: {
  organizationId: string;
  phone: string;
  channel: DeliveryChannel;
}) {
  const phone = normalizeContactPhone(input.phone);
  if (!phone) return 0;

  return retryOnSerializationFailure(() =>
    prisma.$transaction(async (transaction) => {
      const contacts = await transaction.contact.findMany({
        where: { organizationId: input.organizationId, phone },
        select: { id: true, metadata: true },
      });
      await Promise.all(contacts.map((contact) => transaction.contact.update({
        where: { id: contact.id },
        data: { metadata: applyStopPreference(contact.metadata, input.channel) },
      })));
      return contacts.length;
    }, { isolationLevel: "Serializable" }),
  );
}
