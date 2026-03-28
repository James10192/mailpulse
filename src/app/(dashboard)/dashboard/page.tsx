import { Mail, Users, MousePointerClick, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getEmailEventStats } from "@/lib/queries/email-stats";

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

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span>
        <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
      </div>
      <div className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-100">{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const [stats, campaigns] = await Promise.all([getStats(), getRecentCampaigns()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Vue d&apos;ensemble de vos campagnes email
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Contacts actifs" value={stats.activeContacts.toLocaleString("fr-FR")} icon={Users} />
        <StatCard label="Campagnes" value={stats.totalCampaigns} icon={Mail} />
        <StatCard label="Taux de clic" value={`${stats.clickRate}%`} icon={MousePointerClick} />
        <StatCard label="Taux de bounce" value={`${stats.bounceRate}%`} icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Campagnes recentes</h2>
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
                Creez votre premiere campagne pour commencer.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Resume</h2>
          </div>
          <div className="p-5 space-y-4">
            {[
              { label: "Total contacts", value: stats.totalContacts },
              { label: "Contacts abonnes", value: stats.activeContacts },
              { label: "Emails envoyes", value: stats.totalEvents },
              { label: "Taux d'ouverture", value: `${stats.openRate}%` },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 dark:text-zinc-400">{item.label}</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  {typeof item.value === "number" ? item.value.toLocaleString("fr-FR") : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
