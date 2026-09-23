import { prisma } from "@/lib/prisma";
import { findOrganizationSegment } from "@/lib/contacts/tenant-scope";
import { prismaTenantDb } from "@/lib/contacts/prisma-tenant-db";

/** Builds the Prisma where clause of a dynamic segment, always scoped to the organization. */
export function buildSegmentWhere(orgId: string, filters: Record<string, unknown> | null) {
  const where: Record<string, unknown> = { organizationId: orgId };

  if (!filters) return where;

  if (filters.subscribed === true) where.subscribed = true;
  else if (filters.subscribed === false) where.subscribed = false;

  if (typeof filters.engagementMin === "number") {
    where.engagementScore = { ...(where.engagementScore as object || {}), gte: filters.engagementMin };
  }
  if (typeof filters.engagementMax === "number") {
    where.engagementScore = { ...(where.engagementScore as object || {}), lte: filters.engagementMax };
  }

  if (filters.createdAfter) {
    where.createdAt = { ...(where.createdAt as object || {}), gte: new Date(filters.createdAfter as string) };
  }
  if (filters.createdBefore) {
    where.createdAt = { ...(where.createdAt as object || {}), lte: new Date(filters.createdBefore as string) };
  }

  if (Array.isArray(filters.includeTags) && filters.includeTags.length > 0) {
    where.tags = { some: { name: { in: filters.includeTags } } };
  }

  return where;
}

/** Contacts matching a segment of the organization; an unknown or foreign segment yields none. */
export async function resolveSegmentContacts(organizationId: string, segmentId: string) {
  const segment = await findOrganizationSegment(prismaTenantDb, organizationId, segmentId);
  if (!segment) return [];

  const where = buildSegmentWhere(organizationId, segment.dynamicFilter as Record<string, unknown> | null);

  return prisma.contact.findMany({
    where,
    select: { id: true, email: true, firstName: true, lastName: true, subscribed: true, engagementScore: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
