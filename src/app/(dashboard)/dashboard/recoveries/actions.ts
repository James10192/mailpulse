"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, getFeatureUpgradeMessage, type PlanTier } from "@/lib/plan-catalog";

export async function cancelFilonRecovery(recoveryId: string) {
  const { org } = await getCurrentUserAndOrg();
  if (org && !canAccessFeature(org.plan as PlanTier, "recoveries")) return { error: getFeatureUpgradeMessage("recoveries") };
  if (!org) return { error: "Organisation introuvable." };

  const recovery = await prisma.filonRecovery.findUnique({
    where: { id: recoveryId, organizationId: org.id },
    select: { id: true },
  });
  if (!recovery) return { error: "Recouvrement introuvable." };

  await prisma.$transaction([
    prisma.filonRecovery.update({
      where: { id: recoveryId },
      data: { status: "CANCELLED", nextReminderAt: null },
    }),
    prisma.filonRecoveryStep.updateMany({
      where: {
        recoveryId,
        status: { in: ["PENDING", "PREPARED"] },
      },
      data: { status: "CANCELLED" },
    }),
  ]);

  revalidatePath("/dashboard/recoveries");
  return { success: true };
}
