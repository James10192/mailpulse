import {
  Mail,
  Users,
  MousePointerClick,
  AlertTriangle,
  Plus,
  Send,
  Zap,
  UserPlus,
  ArrowRight,
  Search,
  Filter,
} from "lucide-react";
import Link from "next/link";
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

async function getRecentEvents() {
  return prisma.emailEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { contact: { select: { email: true } } },
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

const eventTypeLabels: Record<string, { label: string; color: string }> = {
  SENT: { label: "Envoye", color: "text-blue-500" },
  DELIVERED: { label: "Livre", color: "text-emerald-500" },
  OPENED: { label: "Ouvert", color: "text-cyan-500" },
  CLICKED: { label: "Clique", color: "text-orange-500" },
  BOUNCED_SOFT: { label: "Bounce soft", color: "text-amber-500" },
  BOUNCED_HARD: { label: "Bounce hard", color: "text-red-500" },
  COMPLAINED: { label: "Plainte", color: "text-red-600" },
  UNSUBSCRIBED: { label: "Desabonne", color: "text-zinc-500" },
};

export default async function DashboardPage() {
  const [stats, campaigns, events] = await Promise.all([
    getStats(),
    getRecentCampaigns(),
    getRecentEvents(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Vue d&apos;ensemble de vos campagnes email
          </p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Contacts actifs" value={stats.activeContacts.toLocaleString("fr-FR")} icon={Users} />
        <StatCard label="Campagnes" value={stats.totalCampaigns} icon={Mail} />
        <StatCard label="Taux de clic" value={`${stats.clickRate}%`} icon={MousePointerClick} />
        <StatCard label="Taux de bounce" value={`${stats.bounceRate}%`} icon={AlertTriangle} />
      </div>

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

        {/* Activity Timeline */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Activite</h2>
            <Filter className="h-3.5 w-3.5 text-zinc-400" />
          </div>
          <div className="p-4">
            {events.length > 0 ? (
              <div className="space-y-3">
                {events.map((event) => {
                  const typeInfo = eventTypeLabels[event.type] ?? { label: event.type, color: "text-zinc-500" };
                  return (
                    <div key={event.id} className="flex items-start gap-3">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${typeInfo.color.replace("text-", "bg-")}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs">
                          <span className={`font-medium ${typeInfo.color}`}>{typeInfo.label}</span>
                          <span className="text-zinc-500"> — </span>
                          <span className="text-zinc-400 font-mono truncate">{event.contact.email}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">
                          {new Date(event.createdAt).toLocaleString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-zinc-500 text-center py-8">
                L&apos;activite apparaitra ici apres vos premiers envois.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
