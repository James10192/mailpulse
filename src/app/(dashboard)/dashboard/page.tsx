import {
  Send,
  Zap,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { DateRangeButton } from "@/components/dashboard/date-range-button";
import { LiveStats } from "@/components/dashboard/live-stats";
import { LiveActivityFeed } from "@/components/dashboard/live-activity-feed";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getEmailEventStats } from "@/lib/queries/email-stats";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, getOrgUsage, checkEmailLimit, type PlanTier } from "@/lib/plans";
import { getOverLimitResources } from "@/lib/plan-enforcement";
import { UpgradeBanner, UsageBar } from "@/components/dashboard/feature-gate";

async function getStats() {
  const [contactStats, emailStats, totalCampaigns] = await Promise.all([
    Promise.all([
      prisma.contact.count(),
      prisma.contact.count({ where: { subscribed: true } }),
    ]),
    getEmailEventStats(),
    prisma.campaign.count(),
  ]);

  const [totalContacts, activeContacts] = contactStats;
  return { totalContacts, activeContacts, totalCampaigns, ...emailStats };
}

async function getRecentCampaigns() {
  return prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { analytics: true },
  });
}

export default async function DashboardPage() {
  const [stats, campaigns, { org }] = await Promise.all([
    getStats(),
    getRecentCampaigns(),
    getCurrentUserAndOrg(),
  ]);

  const plan = (org?.plan ?? "FREE") as PlanTier;
  const limits = PLAN_LIMITS[plan];
  const isFreePlan = plan === "FREE";

  // Fetch usage data for FREE plan users
  let usage: { contactCount: number; activeCampaigns: number; automationCount: number } | null = null;
  let emailUsage: { sent: number; limit: number } | null = null;
  let overLimitResources: { resource: string; current: number; limit: number; label: string }[] = [];
  if (isFreePlan && org) {
    const [orgUsage, emailCheck, overLimit] = await Promise.all([
      getOrgUsage(org.id),
      checkEmailLimit(org.id, plan),
      getOverLimitResources(org.id, plan),
    ]);
    usage = orgUsage;
    emailUsage = { sent: emailCheck.sent, limit: emailCheck.limit };
    overLimitResources = overLimit;
  }

  // Check if any limit is above 80%
  const isApproachingLimit = isFreePlan && usage && (
    (usage.contactCount / limits.contacts >= 0.8) ||
    (usage.activeCampaigns / limits.activeCampaigns >= 0.8) ||
    (usage.automationCount / limits.automations >= 0.8) ||
    (emailUsage && emailUsage.limit > 0 && emailUsage.sent / emailUsage.limit >= 0.8)
  );

  const hasOverLimitResources = overLimitResources.length > 0;

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "" }]} />

      {hasOverLimitResources && (
        <UpgradeBanner
          message={`Limites depassees: ${overLimitResources.map((r) => `${r.label} (${r.current}/${r.limit})`).join(", ")}`}
          details="Certaines ressources sont gelees ou vous ne pouvez plus en creer. Passez au Pro pour lever ces restrictions."
        />
      )}

      {!hasOverLimitResources && isApproachingLimit && (
        <UpgradeBanner message="Vous approchez de vos limites du plan Starter" />
      )}

      {isFreePlan && usage && emailUsage && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Utilisation</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UsageBar label="Contacts" current={usage.contactCount} limit={limits.contacts} />
            <UsageBar label="Emails ce mois" current={emailUsage.sent} limit={emailUsage.limit} />
            <UsageBar label="Campagnes actives" current={usage.activeCampaigns} limit={limits.activeCampaigns} />
            <UsageBar label="Automations" current={usage.automationCount} limit={limits.automations} />
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm">
            <Link
              href="/dashboard/transactional"
              className="text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer"
            >
              Transactional
            </Link>
            <span className="text-zinc-600 dark:text-zinc-500">&middot;</span>
            <Link
              href="/dashboard/unsubscribes"
              className="text-zinc-400 hover:text-orange-500 transition-colors cursor-pointer"
            >
              Unsubscribes
            </Link>
          </div>
          <DateRangeButton />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm bg-orange-600 hover:bg-orange-500 text-white font-medium transition-colors cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          Nouvelle campagne
        </Link>
        <Link
          href="/dashboard/contacts"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors bg-white dark:bg-transparent cursor-pointer"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Ajouter contact
        </Link>
        <Link
          href="/dashboard/automations"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors bg-white dark:bg-transparent cursor-pointer"
        >
          <Zap className="h-3.5 w-3.5" />
          Nouveau workflow
        </Link>
      </div>

      {/* Stats — Real-time via Convex with Prisma fallback */}
      <LiveStats fallback={{
        activeContacts: stats.activeContacts,
        totalCampaigns: stats.totalCampaigns,
        clickRate: stats.clickRate,
        bounceRate: stats.bounceRate,
      }} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent campaigns */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Campagnes recentes</h2>
            <Link href="/dashboard/campaigns" className="text-xs text-orange-500 hover:text-orange-400 flex items-center gap-1">
              Voir tout <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="p-5">
            {campaigns.length > 0 ? (
              <div className="space-y-3">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{campaign.name}</div>
                      <div className="text-xs text-zinc-500">
                        {campaign.status} &middot; {new Date(campaign.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    {campaign.analytics && (
                      <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                        {(campaign.analytics.openRate * 100).toFixed(1)}% open
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zinc-500 text-center py-8">
                Aucune campagne pour le moment.
                <br />
                <Link href="/dashboard/campaigns/new" className="text-orange-500 hover:text-orange-400">
                  Creer votre premiere campagne
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed — Real-time via Convex */}
        <LiveActivityFeed />
      </div>
    </div>
  );
}
