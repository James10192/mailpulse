import { Mail, MousePointerClick, Eye, AlertTriangle } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Performance de vos campagnes en detail
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Taux d'ouverture", value: "0%", icon: Eye },
          { label: "Taux de clic", value: "0%", icon: MousePointerClick },
          { label: "Emails envoyes", value: "0", icon: Mail },
          { label: "Taux de bounce", value: "0%", icon: AlertTriangle },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">{kpi.label}</span>
              <kpi.icon className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="text-2xl font-semibold font-mono">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="font-medium mb-4">Evolution des envois</h2>
          <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
            Les graphiques apparaitront apres vos premieres campagnes
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <h2 className="font-medium mb-4">Engagement par campagne</h2>
          <div className="h-64 flex items-center justify-center text-sm text-zinc-500">
            Les graphiques apparaitront apres vos premieres campagnes
          </div>
        </div>
      </div>
    </div>
  );
}
