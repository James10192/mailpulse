"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { syncSendingDomainFromResend } from "@/lib/resend-domains";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { checkDomainLimit, type PlanTier } from "@/lib/plans";
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

  const domainLimit = await checkDomainLimit(org.id, org.plan as PlanTier);
  if (!domainLimit.allowed) {
    return { error: `Limite de domaines atteinte (${domainLimit.limit}). Passez au plan Pro pour ajouter plus de domaines.` };
  }

  try {
    // Create domain via Resend API
    const { data: resendDomain, error: resendError } = await resend.domains.create({
      name: result.data.domain,
    });

    if (resendError) {
      return { error: `Erreur Resend: ${resendError.message}` };
    }

    const records = resendDomain?.records ?? [];
    const spfRecord = records.find((r: { record: string; type?: string }) => r.record === "SPF" && r.type === "TXT")
      ?? records.find((r: { record: string }) => r.record === "SPF");
    const dkimRecord = records.find((r: { record: string; type?: string }) => r.record === "DKIM" && r.type === "TXT")
      ?? records.find((r: { record: string }) => r.record === "DKIM");

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

    await syncSendingDomainFromResend(domain, {
      triggerVerify: true,
      attempts: 4,
      delayMs: 1500,
    });

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
