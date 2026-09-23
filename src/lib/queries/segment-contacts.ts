import { prisma } from "@/lib/prisma";
import { buildSegmentWhere, type SegmentFilter } from "@/lib/contacts/segment-filter";

/**
 * Contacts of the organization matching an already validated segment filter.
 * The caller loads the segment itself, scoped by organization, and passes its filter.
 */
export async function listSegmentContacts(organizationId: string, filter: SegmentFilter | null) {
  return prisma.contact.findMany({
    where: buildSegmentWhere(organizationId, filter),
    select: { id: true, email: true, firstName: true, lastName: true, subscribed: true, engagementScore: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
