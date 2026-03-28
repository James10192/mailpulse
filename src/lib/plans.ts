import { prisma } from "@/lib/prisma";

export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

export type Feature =
  | "ab_testing"
  | "automations_unlimited"
  | "custom_domain"
  | "api_access"
  | "webhooks"
  | "sso"
  | "dedicated_ip"
  | "advanced_analytics"
  | "template_library";

export const PLAN_LIMITS: Record<PlanTier, {
  contacts: number;
  emailsPerMonth: number;
  activeCampaigns: number;
  automations: number;
  snippets: number;
  templates: number;
  segments: number;
  label: string;
  priceFCFA: number;
}> = {
  FREE: {
    contacts: 1000,
    emailsPerMonth: 5000,
    activeCampaigns: 3,
    automations: 1,
    snippets: 10,
    templates: 5,
    segments: 3,
    label: "Starter",
    priceFCFA: 0,
  },
  PRO: {
    contacts: 25000,
    emailsPerMonth: -1, // unlimited
    activeCampaigns: -1,
    automations: -1,
    snippets: -1,
    templates: -1,
    segments: -1,
    label: "Pro",
    priceFCFA: 15000,
  },
  ENTERPRISE: {
    contacts: -1,
    emailsPerMonth: -1,
    activeCampaigns: -1,
    automations: -1,
    snippets: -1,
    templates: -1,
    segments: -1,
    label: "Enterprise",
    priceFCFA: -1, // custom
  },
};

const PLAN_FEATURES: Record<PlanTier, Set<Feature>> = {
  FREE: new Set([]),
  PRO: new Set([
    "ab_testing",
    "automations_unlimited",
    "custom_domain",
    "api_access",
    "webhooks",
    "advanced_analytics",
    "template_library",
  ]),
  ENTERPRISE: new Set([
    "ab_testing",
    "automations_unlimited",
    "custom_domain",
    "api_access",
    "webhooks",
    "advanced_analytics",
    "template_library",
    "sso",
    "dedicated_ip",
  ]),
};

const PLAN_HIERARCHY: Record<PlanTier, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };

export function canAccessFeature(plan: PlanTier, feature: Feature): boolean {
  return PLAN_FEATURES[plan]?.has(feature) ?? false;
}

export function getPlanLimits(plan: PlanTier) {
  return PLAN_LIMITS[plan];
}

export function isPlanAtLeast(plan: PlanTier, minPlan: PlanTier): boolean {
  return PLAN_HIERARCHY[plan] >= PLAN_HIERARCHY[minPlan];
}

export async function getOrgUsage(orgId: string) {
  const [contactCount, activeCampaigns, automationCount] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.campaign.count({ where: { organizationId: orgId, status: { in: ["SENDING", "SCHEDULED", "SENT"] } } }),
    prisma.automation.count({ where: { organizationId: orgId, status: { in: ["ACTIVE", "DRAFT"] } } }),
  ]);

  return { contactCount, activeCampaigns, automationCount };
}

export async function checkContactLimit(orgId: string, plan: PlanTier): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].contacts;
  if (limit === -1) return { allowed: true, current: 0, limit: -1 };

  const current = await prisma.contact.count({ where: { organizationId: orgId } });
  return { allowed: current < limit, current, limit };
}

export async function checkCampaignLimit(orgId: string, plan: PlanTier): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].activeCampaigns;
  if (limit === -1) return { allowed: true, current: 0, limit: -1 };

  const current = await prisma.campaign.count({
    where: { organizationId: orgId, status: { in: ["SENDING", "SCHEDULED"] } },
  });
  return { allowed: current < limit, current, limit };
}

export async function checkAutomationLimit(orgId: string, plan: PlanTier): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].automations;
  if (limit === -1) return { allowed: true, current: 0, limit: -1 };

  const current = await prisma.automation.count({
    where: { organizationId: orgId, status: { not: "ARCHIVED" } },
  });
  return { allowed: current < limit, current, limit };
}

export async function checkEmailLimit(orgId: string, plan: PlanTier): Promise<{ allowed: boolean; sent: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].emailsPerMonth;
  if (limit === -1) return { allowed: true, sent: 0, limit: -1 };

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { emailsSentThisMonth: true, emailsResetAt: true },
  });

  if (!org) return { allowed: false, sent: 0, limit };

  // Reset monthly counter if needed
  const now = new Date();
  const resetAt = org.emailsResetAt ? new Date(org.emailsResetAt) : new Date(0);
  if (now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear()) {
    await prisma.organization.update({
      where: { id: orgId },
      data: { emailsSentThisMonth: 0, emailsResetAt: now },
    });
    return { allowed: true, sent: 0, limit };
  }

  return { allowed: org.emailsSentThisMonth < limit, sent: org.emailsSentThisMonth, limit };
}

export async function checkSnippetLimit(orgId: string, plan: PlanTier): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].snippets;
  if (limit === -1) return { allowed: true, current: 0, limit: -1 };

  const current = await prisma.emailTemplate.count({ where: { organizationId: orgId, category: "snippet" } });
  return { allowed: current < limit, current, limit };
}

export async function checkTemplateLimit(orgId: string, plan: PlanTier): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].templates;
  if (limit === -1) return { allowed: true, current: 0, limit: -1 };

  const current = await prisma.emailTemplate.count({ where: { organizationId: orgId, category: { not: "snippet" } } });
  return { allowed: current < limit, current, limit };
}

export async function checkSegmentLimit(orgId: string, plan: PlanTier): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].segments;
  if (limit === -1) return { allowed: true, current: 0, limit: -1 };

  const current = await prisma.contactList.count({ where: { organizationId: orgId } });
  return { allowed: current < limit, current, limit };
}
