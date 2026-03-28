"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";

export type SegmentActionState = { success?: boolean; error?: string } | null;

const segmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export async function createSegment(
  _prev: SegmentActionState,
  formData: FormData
): Promise<SegmentActionState> {
  const result = segmentSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!result.success) return { error: "Nom requis" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

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
}

export async function deleteSegment(
  id: string
): Promise<SegmentActionState> {
  try {
    await prisma.contactList.delete({ where: { id } });
    revalidatePath("/dashboard/segments");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
