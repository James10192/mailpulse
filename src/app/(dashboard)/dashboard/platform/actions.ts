"use server";

import { revalidatePath } from "next/cache";
import { createMailPulseApiKey, keyHash, keyPreview, type MailPulseApiEnvironment } from "@/lib/mailpulse/api-keys";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

export async function generateMailPulseApiKey(formData: FormData) {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return { error: "Organisation introuvable." };

  const environment = (formData.get("environment") === "TEST" ? "TEST" : "LIVE") as MailPulseApiEnvironment;
  const key = createMailPulseApiKey(environment);

  await prisma.integrationApiKey.create({
    data: {
      organizationId: org.id,
      provider: "MAILPULSE",
      environment,
      name: environment === "TEST" ? "MailPulse Test API" : "MailPulse Live API",
      keyHash: keyHash(key),
      keyPrefix: keyPreview(key),
    },
  });

  revalidatePath("/dashboard/platform");
  return { key };
}

export async function revokeMailPulseApiKey(formData: FormData) {
  const { org } = await getCurrentUserAndOrg();
  if (!org) return;

  const keyId = String(formData.get("keyId") ?? "");
  if (!keyId) return;

  await prisma.integrationApiKey.updateMany({
    where: { id: keyId, organizationId: org.id, provider: "MAILPULSE" },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/dashboard/platform");
}
