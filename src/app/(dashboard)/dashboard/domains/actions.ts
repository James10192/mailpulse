"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, type PlanTier } from "@/lib/plans";
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

  // Custom domains require PRO plan
  if (!canAccessFeature(org.plan as PlanTier, "custom_domain")) {
    return { error: "Les domaines personnalises sont disponibles avec le plan Pro. Passez au Pro pour configurer vos propres domaines." };
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
