import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

/**
 * Called when org.plan changes to a lower tier.
 * Pauses resources that exceed the new plan limits.
 * NEVER deletes data — only freezes/pauses excess resources.
 */
export async function enforcePlanLimits(orgId: string, plan: PlanTier) {
  const limits = PLAN_LIMITS[plan];

  await Promise.all([
    enforceAutomationLimits(orgId, limits.automations),
    enforceCampaignLimits(orgId, limits.activeCampaigns),
    // Contacts, snippets, templates, segments: don't delete, just block new creation
    // Domains: mark inactive if no custom_domain feature
  ]);
}

/**
 * Pause automations that exceed the plan limit.
 * Keeps the oldest ones active (by createdAt).
 */
async function enforceAutomationLimits(orgId: string, limit: number) {
  if (limit === -1) return; // unlimited

  const activeAutomations = await prisma.automation.findMany({
    where: { organizationId: orgId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (activeAutomations.length <= limit) return;

  // Keep the first N (oldest), pause the rest
  const toPause = activeAutomations.slice(limit).map((a) => a.id);

  await prisma.automation.updateMany({
    where: { id: { in: toPause } },
    data: { status: "PAUSED" },
  });
}

/**
 * Pause scheduled campaigns that exceed the plan limit.
 * Keeps the oldest ones active (by createdAt).
 */
async function enforceCampaignLimits(orgId: string, limit: number) {
  if (limit === -1) return; // unlimited

  const activeCampaigns = await prisma.campaign.findMany({
    where: {
      organizationId: orgId,
      status: { in: ["SENDING", "SCHEDULED"] },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (activeCampaigns.length <= limit) return;

  // Keep the first N (oldest), pause the rest
  const toPause = activeCampaigns.slice(limit).map((c) => c.id);

  await prisma.campaign.updateMany({
    where: { id: { in: toPause } },
    data: { status: "PAUSED" },
  });
}

/**
 * Check which resources exceed plan limits for a given org.
 * Used to display warnings on the dashboard.
 */
export async function getOverLimitResources(orgId: string, plan: PlanTier) {
  const limits = PLAN_LIMITS[plan];
  const overLimit: { resource: string; current: number; limit: number; label: string }[] = [];

  const [
    contactCount,
    activeCampaigns,
    automationCount,
    snippetCount,
    segmentCount,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.campaign.count({
      where: { organizationId: orgId, status: { in: ["SENDING", "SCHEDULED"] } },
    }),
    prisma.automation.count({
      where: { organizationId: orgId, status: { not: "ARCHIVED" } },
    }),
    prisma.emailTemplate.count({
      where: { organizationId: orgId, category: "snippet" },
    }),
    prisma.contactList.count({ where: { organizationId: orgId } }),
  ]);

  if (limits.contacts !== -1 && contactCount > limits.contacts) {
    overLimit.push({ resource: "contacts", current: contactCount, limit: limits.contacts, label: "Contacts" });
  }
  if (limits.activeCampaigns !== -1 && activeCampaigns > limits.activeCampaigns) {
    overLimit.push({ resource: "campaigns", current: activeCampaigns, limit: limits.activeCampaigns, label: "Campagnes actives" });
  }
  if (limits.automations !== -1 && automationCount > limits.automations) {
    overLimit.push({ resource: "automations", current: automationCount, limit: limits.automations, label: "Automations" });
  }
  if (limits.snippets !== -1 && snippetCount > limits.snippets) {
    overLimit.push({ resource: "snippets", current: snippetCount, limit: limits.snippets, label: "Snippets" });
  }
  if (limits.segments !== -1 && segmentCount > limits.segments) {
    overLimit.push({ resource: "segments", current: segmentCount, limit: limits.segments, label: "Segments" });
  }

  return overLimit;
}
