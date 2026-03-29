"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkSegmentLimit, type PlanTier } from "@/lib/plans";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";

const segmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  filters: z.string().optional(),
});

export async function createSegment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = segmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    filters: formData.get("filters"),
  });
  if (!result.success) return { error: "Nom requis" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  const segmentCheck = await checkSegmentLimit(org.id, org.plan as PlanTier);
  if (!segmentCheck.allowed) {
    return { error: `Limite de segments atteinte (${segmentCheck.limit}). Passez au plan Pro pour en creer davantage.` };
  }

  let dynamicFilter = null;
  if (result.data.filters) {
    try { dynamicFilter = JSON.parse(result.data.filters); } catch { /* ignore */ }
  }

  try {
    // Resolve contact count based on filters
    const where = buildSegmentWhere(org.id, dynamicFilter);
    const contactCount = await prisma.contact.count({ where });

    await prisma.contactList.create({
      data: {
        name: result.data.name,
        description: result.data.description || null,
        type: "dynamic",
        dynamicFilter,
        contactCount,
        userId: user.id,
        organizationId: org.id,
      },
    });

    trackServerEvent(user.id, EVENTS.SEGMENT_CREATED, { segment_name: result.data.name }, org.id);

    revalidatePath("/dashboard/segments");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la creation du segment." };
  }
}

// Build Prisma where clause from dynamic filter JSON
function buildSegmentWhere(orgId: string, filters: Record<string, unknown> | null) {
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

export async function resolveSegmentContacts(segmentId: string) {
  const segment = await prisma.contactList.findUnique({
    where: { id: segmentId },
    select: { organizationId: true, dynamicFilter: true },
  });
  if (!segment) return [];

  const where = buildSegmentWhere(segment.organizationId, segment.dynamicFilter as Record<string, unknown> | null);

  return prisma.contact.findMany({
    where,
    select: { id: true, email: true, firstName: true, lastName: true, subscribed: true, engagementScore: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function deleteSegment(id: string): Promise<ActionState> {
  try {
    await prisma.contactList.delete({ where: { id } });
    trackServerEvent("system", EVENTS.SEGMENT_DELETED, { segment_id: id });
    revalidatePath("/dashboard/segments");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
