import { prisma } from "@/lib/prisma";

export {
  canAccessFeature,
  getFeatureUpgradeMessage,
  getPlanLimits,
  PLAN_CATALOG,
  PLAN_LIMITS,
  type PlanFeature as Feature,
  type PlanTier,
} from "@/lib/plan-catalog";

import { PLAN_LIMITS, type PlanTier } from "@/lib/plan-catalog";

export async function getOrgUsage(orgId: string) {
  const [contactCount, activeCampaigns, automationCount, domainCount] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.campaign.count({ where: { organizationId: orgId, status: { in: ["SENDING", "SCHEDULED"] } } }),
    prisma.automation.count({ where: { organizationId: orgId, status: { not: "ARCHIVED" } } }),
    prisma.sendingDomain.count({ where: { organizationId: orgId } }),
  ]);

  return { contactCount, activeCampaigns, automationCount, domainCount };
}

export async function checkContactLimit(orgId: string, plan: PlanTier) {
  return checkLimit(orgId, plan, "contacts", () => prisma.contact.count({ where: { organizationId: orgId } }));
}

export async function checkCampaignLimit(orgId: string, plan: PlanTier) {
  return checkLimit(orgId, plan, "activeCampaigns", () =>
    prisma.campaign.count({ where: { organizationId: orgId, status: { in: ["SENDING", "SCHEDULED"] } } })
  );
}

export async function checkAutomationLimit(orgId: string, plan: PlanTier) {
  return checkLimit(orgId, plan, "automations", () =>
    prisma.automation.count({ where: { organizationId: orgId, status: { not: "ARCHIVED" } } })
  );
}

export async function checkSnippetLimit(orgId: string, plan: PlanTier) {
  return checkLimit(orgId, plan, "snippets", () =>
    prisma.emailTemplate.count({ where: { organizationId: orgId, category: "snippet" } })
  );
}

export async function checkSegmentLimit(orgId: string, plan: PlanTier) {
  return checkLimit(orgId, plan, "segments", () => prisma.contactList.count({ where: { organizationId: orgId } }));
}

export async function checkDomainLimit(orgId: string, plan: PlanTier) {
  return checkLimit(orgId, plan, "domains", () => prisma.sendingDomain.count({ where: { organizationId: orgId } }));
}

async function checkLimit(
  orgId: string,
  plan: PlanTier,
  limitKey: "contacts" | "activeCampaigns" | "automations" | "snippets" | "segments" | "domains",
  count: () => Promise<number>
) {
  const limit = PLAN_LIMITS[plan][limitKey];
  if (limit === -1) return { allowed: true, current: 0, limit };
  const current = await count();
  return { allowed: current < limit, current, limit };
}

export async function checkEmailLimit(orgId: string, plan: PlanTier): Promise<{ allowed: boolean; sent: number; limit: number }> {
  const limit = PLAN_LIMITS[plan].emailsPerMonth;
  if (limit === -1) return { allowed: true, sent: 0, limit };

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: { emailsSentThisMonth: true, emailsResetAt: true },
    });
    if (!org) return { allowed: false, sent: 0, limit };

    const resetAt = org.emailsResetAt ? new Date(org.emailsResetAt) : new Date(0);
    if (resetAt.getMonth() !== currentMonth || resetAt.getFullYear() !== currentYear) {
      await tx.organization.updateMany({
        where: { id: orgId, emailsResetAt: { lt: new Date(currentYear, currentMonth, 1) } },
        data: { emailsSentThisMonth: 0, emailsResetAt: now },
      });
      return { allowed: true, sent: 0, limit };
    }
    return { allowed: org.emailsSentThisMonth < limit, sent: org.emailsSentThisMonth, limit };
  });
}
