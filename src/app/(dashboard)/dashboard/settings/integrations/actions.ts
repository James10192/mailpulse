"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import {
  createFilonApiKey,
  hashIntegrationKey,
  keyPreview,
} from "@/lib/filon-recovery/auth";

export async function generateFilonIntegrationKey() {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Organisation introuvable." };

  const key = createFilonApiKey();
  await prisma.integrationApiKey.create({
    data: {
      provider: "FILON",
      name: "Filon Recovery",
      keyHash: hashIntegrationKey(key),
      keyPrefix: keyPreview(key),
      organizationId: org.id,
    },
  });

  revalidatePath("/dashboard/settings/integrations");
  return { key };
}

export async function revokeFilonIntegrationKey(keyId: string) {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Organisation introuvable." };

  await prisma.integrationApiKey.update({
    where: { id: keyId, organizationId: org.id },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/dashboard/settings/integrations");
  return { success: true };
}
