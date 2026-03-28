import {
  Send,
  BarChart3,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DateRangeButton } from "@/components/dashboard/date-range-button";

async function getTransactionalStats() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const dateFilter = { createdAt: { gte: thirtyDaysAgo } };

  const [sent, delivered, opened, clicked, bounced] = await Promise.all([
    prisma.emailEvent.count({ where: { type: "SENT", ...dateFilter } }),
    prisma.emailEvent.count({ where: { type: "DELIVERED", ...dateFilter } }),
    prisma.emailEvent.count({ where: { type: "OPENED", ...dateFilter } }),
    prisma.emailEvent.count({ where: { type: "CLICKED", ...dateFilter } }),
    prisma.emailEvent.count({
      where: {
        type: { in: ["BOUNCED_HARD", "BOUNCED_SOFT"] },
        ...dateFilter,
      },
    }),
  ]);

  const deliveryRate = sent > 0 ? ((delivered / sent) * 100).toFixed(1) : "0.0";
  const openRate = delivered > 0 ? ((opened / delivered) * 100).toFixed(1) : "0.0";
  const clickRate = delivered > 0 ? ((clicked / delivered) * 100).toFixed(1) : "0.0";
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0.0";

  return { sent, delivered, opened, clicked, bounced, deliveryRate, openRate, clickRate, bounceRate };
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

export default async function TransactionalPage() {
  const stats = await getTransactionalStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Transactional Emails
        </h1>
        <DateRangeButton />
      </div>

      {/* Top row — 3 cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Summary */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-zinc-400" />
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {stats.sent > 0
                ? `${stats.sent.toLocaleString("fr-FR")} emails transactionnels envoyes`
                : "Aucun email transactionnel dans cette periode"}
            </span>
          </div>
        </div>

        {/* Delivery Status */}
        <StatCard title="Delivery Status" icon={BarChart3}>
          {stats.sent > 0 ? (
            <div className="space-y-2">
              <div className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                {stats.deliveryRate}%
              </div>
              <div className="text-xs text-zinc-500">
                {stats.delivered.toLocaleString("fr-FR")} livres sur {stats.sent.toLocaleString("fr-FR")} envoyes
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucun email transactionnel envoye</p>
          )}
        </StatCard>

        {/* Total Sent */}
        <StatCard title="Total Sent" icon={Send}>
          {stats.sent > 0 ? (
            <div className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-100">
              {stats.sent.toLocaleString("fr-FR")}
            </div>
          ) : (
            <p className="text-sm text-orange-500">Aucun email transactionnel envoye</p>
          )}
        </StatCard>
      </div>

      {/* Bottom row — 2 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Deliverability */}
        <StatCard title="Deliverability" icon={ShieldCheck}>
          {stats.sent > 0 ? (
            <div className="space-y-3">
              <div className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                {stats.deliveryRate}%
              </div>
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${stats.deliveryRate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Bounces: {stats.bounced}</span>
                <span>Taux de bounce: {stats.bounceRate}%</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucune donnee de delivrabilite disponible</p>
          )}
        </StatCard>

        {/* Engagement */}
        <StatCard title="Engagement" icon={Sparkles}>
          {stats.sent > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Taux d&apos;ouverture</div>
                  <div className="text-xl font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                    {stats.openRate}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Taux de clic</div>
                  <div className="text-xl font-semibold font-mono text-zinc-900 dark:text-zinc-100">
                    {stats.clickRate}%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Aucune donnee d&apos;engagement disponible</p>
          )}
        </StatCard>
      </div>

      {/* Volume Trend */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-zinc-400" />
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Volume Trend
          </span>
        </div>
        {stats.sent > 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-zinc-500">
            Graphique de tendance (bientot disponible)
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center">
            <TrendingUp className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mb-2" />
            <p className="text-sm text-zinc-500">Aucun email transactionnel dans cette periode</p>
          </div>
        )}
      </div>
    </div>
  );
}
