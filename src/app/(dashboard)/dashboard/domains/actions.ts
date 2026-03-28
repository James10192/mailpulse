"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";
import { z } from "zod";
import type { ActionState } from "@/types/action-state";
import { trackServerEvent, EVENTS } from "@/lib/analytics";

const domainSchema = z.object({
  domain: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Domaine invalide"),
});

export async function createDomain(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const result = domainSchema.safeParse({
    domain: formData.get("domain"),
  });
  if (!result.success) return { error: "Domaine invalide" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  // Check domain limit (FREE: 1, PRO: unlimited)
  const plan = org.plan as PlanTier;
  const domainLimit = plan === "FREE" ? 1 : -1;
  if (domainLimit !== -1) {
    const count = await prisma.sendingDomain.count({ where: { organizationId: org.id } });
    if (count >= domainLimit) {
      return { error: `Limite de domaines atteinte (${domainLimit}). Passez au plan Pro pour ajouter plus de domaines.` };
    }
  }

  try {
    await prisma.sendingDomain.create({
      data: {
        domain: result.data.domain,
        organizationId: org.id,
      },
    });
    trackServerEvent(user.id, EVENTS.DOMAIN_CREATED, { domain: result.data.domain }, org.id);
    revalidatePath("/dashboard/domains");
    return { success: true };
  } catch (e) {
    if ((e as Record<string, unknown>).code === "P2002")
      return { error: "Ce domaine existe deja." };
    return { error: "Erreur." };
  }
}

export async function deleteDomain(
  id: string
): Promise<ActionState> {
  try {
    await prisma.sendingDomain.delete({ where: { id } });
    trackServerEvent("system", EVENTS.DOMAIN_DELETED, { domain_id: id });
    revalidatePath("/dashboard/domains");
    return { success: true };
  } catch {
    return { error: "Erreur." };
  }
}
