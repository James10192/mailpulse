"use server";

import { revalidatePath } from "next/cache";
import { managerOnlyRefusal } from "@/lib/access/manager-only";
import { canAccessFeature, getFeatureUpgradeMessage, type PlanTier } from "@/lib/plan-catalog";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { resendWebhookDelivery, rotateWebhookSecret } from "@/lib/mailpulse/webhooks";

// A webhook receives every message event, recipients included: deciding where
// they go, and with which secret, is for the organization's managers.
type Refusal = { error: string };

/** The organization, if the member is a manager on a plan with webhooks; otherwise why not. */
async function managedOrganization(): Promise<{ organizationId: string } | Refusal> {
  const context = await getCurrentUserAndOrg();
  const { org } = context;
  if (!org) return { error: "Organisation introuvable." };
  if (!canAccessFeature(org.plan as PlanTier, "webhooks")) return { error: getFeatureUpgradeMessage("webhooks") };
  const refusal = managerOnlyRefusal(context);
  if (refusal) return refusal;
  return { organizationId: org.id };
}

/** The new secret is returned once and never shown again. */
export async function rotateWebhookSigningSecret(endpointId: string) {
  const access = await managedOrganization();
  if ("error" in access) return access;

  const rotated = await rotateWebhookSecret(access.organizationId, endpointId);
  if (!rotated) return { error: "Webhook introuvable." };
  revalidatePath("/dashboard/platform");
  return { secret: rotated.secret, previousExpiresAt: rotated.endpoint.previousSecretExpiresAt?.toISOString() ?? null };
}

export async function setWebhookActive(endpointId: string, active: boolean) {
  const access = await managedOrganization();
  if ("error" in access) return access;

  const updated = await prisma.webhookEndpoint.updateMany({ where: { id: endpointId, organizationId: access.organizationId }, data: { active } });
  if (updated.count !== 1) return { error: "Webhook introuvable." };
  revalidatePath("/dashboard/platform");
  return { success: true };
}

export async function resendWebhook(deliveryId: string) {
  const access = await managedOrganization();
  if ("error" in access) return access;

  const outcome = await resendWebhookDelivery(access.organizationId, deliveryId);
  if (!outcome) return { error: "Cette livraison ne peut pas être renvoyée : déjà délivrée, ou introuvable." };
  revalidatePath("/dashboard/platform");
  return { status: outcome.status, lastError: outcome.lastError };
}
