"use server";

import { revalidatePath } from "next/cache";
import { managerOnlyRefusal } from "@/lib/access/manager-only";
import { canAccessFeature, getFeatureUpgradeMessage, type PlanTier } from "@/lib/plan-catalog";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { resendWebhookDelivery, rotateWebhookSecret } from "@/lib/mailpulse/webhooks";
import { webhookUrlProblem } from "@/lib/mailpulse/webhook-policy";

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
  if ("conflict" in rotated) return { error: "Le secret vient d'être changé par quelqu'un d'autre. Réessayez." };
  revalidatePath("/dashboard/platform");
  return { secret: rotated.secret, previousExpiresAt: rotated.endpoint.previousSecretExpiresAt?.toISOString() ?? null };
}

export async function setWebhookActive(endpointId: string, active: boolean) {
  const access = await managedOrganization();
  if ("error" in access) return access;

  if (active) {
    // Reactivating an endpoint whose address is refused would only fail every delivery.
    const endpoint = await prisma.webhookEndpoint.findFirst({ where: { id: endpointId, organizationId: access.organizationId }, select: { url: true } });
    const problem = endpoint ? webhookUrlProblem(endpoint.url) : null;
    if (problem) return { error: `Adresse refusée : ${problem}. Recréez le webhook avec une adresse HTTPS publique.` };
  }
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
