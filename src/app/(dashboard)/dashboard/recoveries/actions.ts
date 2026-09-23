"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, getFeatureUpgradeMessage } from "@/lib/plan-catalog";

export async function cancelFilonRecovery(recoveryId: string) {
  const { org } = await getCurrentUserAndOrg();
  if (org && !canAccessFeature(org.plan, "recoveries")) return { error: getFeatureUpgradeMessage("recoveries") };
  if (!org) return { error: "Organisation introuvable." };

  // Only a recovery still in progress can be cancelled; a finished one keeps its status.
  const outcome = await prisma.$transaction(async (tx) => {
    const recovery = await tx.filonRecovery.findFirst({
      where: { id: recoveryId, organizationId: org.id },
      select: { status: true },
    });
    if (!recovery) return "not_found" as const;

    const { count } = await tx.filonRecovery.updateMany({
      where: { id: recoveryId, organizationId: org.id, status: { in: ["PENDING", "ACTIVE"] } },
      data: { status: "CANCELLED", nextReminderAt: null },
    });
    if (count === 0) return "not_cancellable" as const;

    await tx.filonRecoveryStep.updateMany({
      where: {
        recoveryId,
        recovery: { organizationId: org.id },
        status: { in: ["PENDING", "PREPARED"] },
      },
      data: { status: "CANCELLED" },
    });
    return "cancelled" as const;
  });
  if (outcome === "not_found") return { error: "Recouvrement introuvable." };
  if (outcome === "not_cancellable") return { error: "Ce recouvrement est déjà terminé ou annulé." };

  revalidatePath("/dashboard/recoveries");
  return { success: true };
}
