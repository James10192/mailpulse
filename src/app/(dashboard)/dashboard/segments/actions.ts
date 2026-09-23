"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkSegmentLimit, type PlanTier } from "@/lib/plans";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";
import { buildSegmentWhere } from "@/lib/queries/segment-contacts";
import { deleteOrganizationSegment } from "@/lib/contacts/tenant-scope";
import { prismaTenantDb } from "@/lib/contacts/prisma-tenant-db";

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
  if (!user || !org) return { error: "Non authentifié." };

  const segmentCheck = await checkSegmentLimit(org.id, org.plan as PlanTier);
  if (!segmentCheck.allowed) {
    return { error: `Limite de segments atteinte (${segmentCheck.limit}). Passez au plan Pro pour en créer davantage.` };
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
    return { error: "Erreur lors de la création du segment." };
  }
}

export async function deleteSegment(id: string): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifié." };

  try {
    const result = await deleteOrganizationSegment(prismaTenantDb, org.id, id);
    if (!result.ok) return { error: "Segment introuvable." };

    trackServerEvent(user.id, EVENTS.SEGMENT_DELETED, { segment_id: id }, org.id);
    revalidatePath("/dashboard/segments");
    return { success: true };
  } catch (error) {
    console.error("[segments] Failed to delete segment", { organizationId: org.id, segmentId: id, error });
    return { error: "Erreur lors de la suppression." };
  }
}
