"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkSegmentLimit, type PlanTier } from "@/lib/plans";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";

const segmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function createSegment(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = segmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!result.success) return { error: "Nom requis" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  // Check segment limit
  const segmentCheck = await checkSegmentLimit(org.id, org.plan as PlanTier);
  if (!segmentCheck.allowed) {
    return { error: `Limite de segments atteinte (${segmentCheck.limit}). Passez au plan Pro pour en creer davantage.` };
  }

  try {
    await prisma.contactList.create({
      data: {
        name: result.data.name,
        description: result.data.description || null,
        type: "dynamic",
        userId: user.id,
        organizationId: org.id,
      },
    });

    revalidatePath("/dashboard/segments");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la creation du segment." };
  }
}

export async function deleteSegment(id: string): Promise<ActionState> {
  try {
    await prisma.contactList.delete({ where: { id } });
    revalidatePath("/dashboard/segments");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
