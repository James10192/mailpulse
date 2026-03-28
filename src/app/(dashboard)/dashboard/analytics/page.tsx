import { Mail, MousePointerClick, Eye, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getAnalytics() {
  const [totalEvents, openEvents, clickEvents, bounceEvents] = await Promise.all([
    prisma.emailEvent.count(),
    prisma.emailEvent.count({ where: { type: "OPENED" } }),
    prisma.emailEvent.count({ where: { type: "CLICKED" } }),
    prisma.emailEvent.count({ where: { type: { in: ["BOUNCED_HARD", "BOUNCED_SOFT"] } } }),
  ]);

  const delivered = totalEvents > 0 ? totalEvents : 1;
  return {
    totalEvents,
    openRate: ((openEvents / delivered) * 100).toFixed(1),
    clickRate: ((clickEvents / delivered) * 100).toFixed(1),
    bounceRate: ((bounceEvents / delivered) * 100).toFixed(1),
  };
}

export default async function AnalyticsPage() {
  const analytics = await getAnalytics();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Performance de vos campagnes en detail
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Taux d'ouverture", value: `${analytics.openRate}%`, icon: Eye },
          { label: "Taux de clic", value: `${analytics.clickRate}%`, icon: MousePointerClick },
          { label: "Emails envoyes", value: analytics.totalEvents.toLocaleString("fr-FR"), icon: Mail },
          { label: "Taux de bounce", value: `${analytics.bounceRate}%`, icon: AlertTriangle },
        ].map((kpi) => (
          <div key={kpi.label} className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-500 dark:text-zinc-400">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-100">{kpi.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100 mb-4">Evolution des envois</h2>
          <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
            Les graphiques apparaitront apres vos premieres campagnes
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100 mb-4">Engagement par campagne</h2>
          <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
            Les graphiques apparaitront apres vos premieres campagnes
          </div>
        </div>
      </div>
    </div>
  );
}
