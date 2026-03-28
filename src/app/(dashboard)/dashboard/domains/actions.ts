"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { z } from "zod";

export type DomainActionState = { success?: boolean; error?: string } | null;

const domainSchema = z.object({
  domain: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Domaine invalide"),
});

export async function createDomain(
  _prev: DomainActionState,
  formData: FormData
): Promise<DomainActionState> {
  const result = domainSchema.safeParse({
    domain: formData.get("domain"),
  });
  if (!result.success) return { error: "Domaine invalide" };

  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) return { error: "Non authentifie." };

  try {
    await prisma.sendingDomain.create({
      data: {
        domain: result.data.domain,
        organizationId: org.id,
      },
    });
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
): Promise<DomainActionState> {
  try {
    await prisma.sendingDomain.delete({ where: { id } });
    revalidatePath("/dashboard/domains");
    return { success: true };
  } catch {
    return { error: "Erreur." };
  }
}
