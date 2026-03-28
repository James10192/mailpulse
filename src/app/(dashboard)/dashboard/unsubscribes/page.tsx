import {
  UserMinus,
  Send,
  Heart,
  ShieldAlert,
  BookmarkX,
  Mail,
  TrendingDown,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DateRangeButton } from "@/components/dashboard/date-range-button";

async function getUnsubscribeStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dateFilter = { createdAt: { gte: thirtyDaysAgo } };

  const [
    totalContacts,
    activeContacts,
    unsubscribedContacts,
    unsubscribeEvents,
    totalSent,
    campaignsWithUnsubs,
  ] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { subscribed: true } }),
    prisma.contact.count({ where: { subscribed: false } }),
    prisma.emailEvent.count({ where: { type: "UNSUBSCRIBED", ...dateFilter } }),
    prisma.emailEvent.count({ where: { type: "SENT", ...dateFilter } }),
    prisma.emailEvent.findMany({
      where: { type: "UNSUBSCRIBED", ...dateFilter },
      include: {
        recipient: {
          include: { campaign: { select: { id: true, name: true } } },
        },
      },
    }),
  ]);

  const unsubRate = totalSent > 0 ? ((unsubscribeEvents / totalSent) * 100).toFixed(2) : "0.00";
  const healthScore = totalContacts > 0
    ? Math.round(((activeContacts / totalContacts) * 100))
    : 100;

  // Group by campaign
  const campaignMap = new Map<string, { name: string; count: number }>();
  for (const event of campaignsWithUnsubs) {
    if (event.recipient?.campaign) {
      const key = event.recipient.campaign.id;
      const existing = campaignMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        campaignMap.set(key, { name: event.recipient.campaign.name, count: 1 });
      }
    }
  }
  const campaignUnsubs = Array.from(campaignMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalContacts,
    activeContacts,
    unsubscribedContacts,
    unsubscribeEvents,
    totalSent,
    unsubRate,
    healthScore,
    campaignUnsubs,
  };
}

function StatCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-zinc-400" />
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function StatLine({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
        <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      </span>
      <span className="text-zinc-300 flex-1 mx-2 border-b border-dotted border-zinc-300 dark:border-zinc-700" />
      <span className="font-mono text-zinc-700 dark:text-zinc-300">{value}</span>
    </div>
  );
}

export default async function UnsubscribesPage() {
  const stats = await getUnsubscribeStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Unsubscribes
        </h1>
        <DateRangeButton />
      </div>

      {/* Top row — 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Period summary */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <UserMinus className="h-5 w-5 text-zinc-400" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {stats.unsubscribeEvents > 0
                ? `${stats.unsubscribeEvents} desabonnement${stats.unsubscribeEvents > 1 ? "s" : ""} dans cette periode`
                : "Aucun desabonnement dans cette periode"}
            </span>
          </div>
        </div>

        {/* Emails sent */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-zinc-400" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {stats.totalSent > 0
                ? `${stats.totalSent.toLocaleString("fr-FR")} emails envoyes dans cette periode`
                : "Aucun email envoye dans cette periode"}
            </span>
          </div>
        </div>

        {/* List Health */}
        <StatCard title="List Health" icon={Heart}>
          <div className="space-y-3">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold font-mono text-emerald-500">
                {stats.healthScore}
              </span>
              <span className="text-sm text-zinc-500">/ 100</span>
            </div>
            <div className="space-y-2">
              <StatLine label="Active Subscribers" value={stats.activeContacts} color="bg-emerald-500" />
              <StatLine label="Unsubscribed" value={stats.unsubscribedContacts} color="bg-orange-500" />
              <StatLine label="Total Contacts" value={stats.totalContacts} color="bg-zinc-400" />
            </div>
          </div>
        </StatCard>
      </div>

      {/* Middle row — 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Unsubscribe Rate Score */}
        <StatCard title="Unsubscribe Rate Score" icon={ShieldAlert}>
          <div className="space-y-3">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-semibold font-mono ${
                Number(stats.unsubRate) < 0.5 ? "text-emerald-500" :
                Number(stats.unsubRate) < 2 ? "text-amber-500" : "text-red-500"
              }`}>
                {stats.healthScore}
              </span>
              <span className="text-sm text-zinc-500">/ 100</span>
            </div>
            <ProgressBar
              value={stats.healthScore}
              color={
                Number(stats.unsubRate) < 0.5 ? "bg-emerald-500" :
                Number(stats.unsubRate) < 2 ? "bg-amber-500" : "bg-red-500"
              }
            />
            <div className="space-y-2 mt-2">
              <StatLine label="Unsubscribe Rate" value={`${stats.unsubRate}%`} color="bg-orange-500" />
              <StatLine label="Unsubscribes" value={stats.unsubscribeEvents} color="bg-red-500" />
              <StatLine label="Emails Sent" value={stats.totalSent.toLocaleString("fr-FR")} color="bg-blue-500" />
            </div>
          </div>
        </StatCard>

        {/* Unsubscribe Reasons */}
        <StatCard title="Unsubscribe Reasons" icon={BookmarkX}>
          {stats.unsubscribeEvents > 0 ? (
            <div className="text-sm text-zinc-500">
              {stats.unsubscribeEvents} raison{stats.unsubscribeEvents > 1 ? "s" : ""} enregistree{stats.unsubscribeEvents > 1 ? "s" : ""}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <BookmarkX className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-500">Aucune raison de desabonnement enregistree</p>
            </div>
          )}
        </StatCard>

        {/* Campaign Unsubscribes */}
        <StatCard title="Campaign Unsubscribes" icon={Mail}>
          {stats.campaignUnsubs.length > 0 ? (
            <div className="space-y-2">
              {stats.campaignUnsubs.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400 truncate mr-2">{c.name}</span>
                  <span className="font-mono text-zinc-700 dark:text-zinc-300">{c.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-4">
              <Mail className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm text-zinc-500">Aucun desabonnement lie a des campagnes</p>
            </div>
          )}
        </StatCard>
      </div>

      {/* Unsubscribe Trend */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Unsubscribe Trend
          </span>
        </div>
        {stats.unsubscribeEvents > 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-zinc-500">
            Graphique de tendance (bientot disponible)
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center">
            <TrendingDown className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-500">Aucun desabonnement dans cette periode</p>
          </div>
        )}
      </div>
    </div>
  );
}
