"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Mail, Users, MousePointerClick, AlertTriangle } from "lucide-react";
import { useActiveOrganization } from "@/lib/auth-client";

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
      <div className="text-2xl font-semibold font-mono text-zinc-900 dark:text-zinc-100">
        {value}
      </div>
    </div>
  );
}

export function LiveStats({
  fallback,
}: {
  fallback: {
    activeContacts: number;
    totalCampaigns: number;
    clickRate: string;
    bounceRate: string;
  };
}) {
  const { data: org } = useActiveOrganization();
  const orgId = org?.id ?? "";

  const stats = useQuery(
    api.dashboard.getStats,
    orgId ? { organizationId: orgId } : "skip"
  );

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Contacts actifs"
          value={fallback.activeContacts.toLocaleString("fr-FR")}
          icon={Users}
        />
        <StatCard label="Campagnes" value={fallback.totalCampaigns} icon={Mail} />
        <StatCard label="Taux de clic" value={`${fallback.clickRate}%`} icon={MousePointerClick} />
        <StatCard label="Taux de bounce" value={`${fallback.bounceRate}%`} icon={AlertTriangle} />
      </div>
    );
  }

  const delivered = stats.totalDelivered || 1;
  const sent = stats.totalSent || 1;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Emails envoyes"
        value={stats.totalSent.toLocaleString("fr-FR")}
        icon={Mail}
      />
      <StatCard
        label="Livres"
        value={stats.totalDelivered.toLocaleString("fr-FR")}
        icon={Users}
      />
      <StatCard
        label="Taux de clic"
        value={`${((stats.totalClicked / delivered) * 100).toFixed(1)}%`}
        icon={MousePointerClick}
      />
      <StatCard
        label="Taux de bounce"
        value={`${((stats.totalBounced / sent) * 100).toFixed(1)}%`}
        icon={AlertTriangle}
      />
    </div>
  );
}
