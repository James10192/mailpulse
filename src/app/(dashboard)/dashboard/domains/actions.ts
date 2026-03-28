"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
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
    // Create domain via Resend API
    const { data: resendDomain, error: resendError } = await resend.domains.create({
      name: result.data.domain,
    });

    if (resendError) {
      return { error: `Erreur Resend: ${resendError.message}` };
    }

    // Extract DNS records from Resend response
    const spfRecord = resendDomain?.records?.find((r: { record: string }) => r.record === "SPF");
    const dkimRecord = resendDomain?.records?.find((r: { record: string }) => r.record === "DKIM");

    await prisma.sendingDomain.create({
      data: {
        domain: result.data.domain,
        resendDomainId: resendDomain?.id ?? null,
        status: resendDomain?.status ?? "not_started",
        spfRecord: spfRecord?.value ?? null,
        spfStatus: spfRecord?.status ?? null,
        dkimRecord: dkimRecord?.value ?? null,
        dkimName: dkimRecord?.name ?? null,
        dkimStatus: dkimRecord?.status ?? null,
        region: resendDomain?.region ?? "us-east-1",
        organizationId: org.id,
      },
    });

    trackServerEvent(user.id, EVENTS.DOMAIN_CREATED, { domain: result.data.domain }, org.id);
    revalidatePath("/dashboard/domains");
    return { success: true };
  } catch (e) {
    if ((e as Record<string, unknown>).code === "P2002")
      return { error: "Ce domaine existe deja." };
    return { error: "Erreur lors de la creation du domaine." };
  }
}

export async function verifyDomain(id: string): Promise<ActionState> {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Non authentifie." };

  try {
    const domain = await prisma.sendingDomain.findUnique({
      where: { id, organizationId: org.id },
    });
    if (!domain || !domain.resendDomainId) return { error: "Domaine introuvable." };

    // Trigger verification via Resend API
    await resend.domains.verify(domain.resendDomainId);

    // Fetch updated status
    const { data: updated } = await resend.domains.get(domain.resendDomainId);

    if (updated) {
      const spfRecord = updated.records?.find((r: { record: string }) => r.record === "SPF");
      const dkimRecord = updated.records?.find((r: { record: string }) => r.record === "DKIM");

      await prisma.sendingDomain.update({
        where: { id },
        data: {
          status: updated.status ?? domain.status,
          verified: updated.status === "verified",
          spfStatus: spfRecord?.status ?? domain.spfStatus,
          dkimStatus: dkimRecord?.status ?? domain.dkimStatus,
          verifiedAt: updated.status === "verified" ? new Date() : null,
        },
      });
    }

    revalidatePath("/dashboard/domains");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la verification." };
  }
}

export async function deleteDomain(id: string): Promise<ActionState> {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    const domain = await prisma.sendingDomain.findUnique({
      where: { id, organizationId: org.id },
    });

    // Delete from Resend if it has an ID
    if (domain?.resendDomainId) {
      await resend.domains.remove(domain.resendDomainId).catch(() => {});
    }

    await prisma.sendingDomain.delete({ where: { id, organizationId: org.id } });
    trackServerEvent(user.id, EVENTS.DOMAIN_DELETED, { domain_id: id }, org.id);
    revalidatePath("/dashboard/domains");
    return { success: true };
  } catch {
    return { error: "Erreur lors de la suppression." };
  }
}
