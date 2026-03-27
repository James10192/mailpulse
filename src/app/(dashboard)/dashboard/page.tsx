import { Mail, Users, MousePointerClick, AlertTriangle } from "lucide-react";

function StatCard({
  label,
  value,
  change,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  icon: React.ElementType;
}) {
  const isPositive = change.startsWith("+");
  return (
    <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-zinc-400">{label}</span>
        <Icon className="h-4 w-4 text-zinc-500" />
      </div>
      <div className="text-2xl font-semibold font-mono">{value}</div>
      <div
        className={`text-xs mt-1 ${isPositive ? "text-emerald-400" : "text-red-400"}`}
      >
        {change} vs mois dernier
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Vue d&apos;ensemble de vos campagnes email
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Emails envoyes"
          value="12,847"
          change="+12.3%"
          icon={Mail}
        />
        <StatCard
          label="Contacts actifs"
          value="3,291"
          change="+5.2%"
          icon={Users}
        />
        <StatCard
          label="Taux de clic"
          value="4.8%"
          change="+0.7%"
          icon={MousePointerClick}
        />
        <StatCard
          label="Taux de bounce"
          value="1.2%"
          change="-0.3%"
          icon={AlertTriangle}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent campaigns */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="p-5 border-b border-zinc-800">
            <h2 className="font-medium">Campagnes recentes</h2>
          </div>
          <div className="p-5">
            <div className="text-sm text-zinc-500 text-center py-8">
              Aucune campagne pour le moment.
              <br />
              Creez votre premiere campagne pour commencer.
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="p-5 border-b border-zinc-800">
            <h2 className="font-medium">Activite recente</h2>
          </div>
          <div className="p-5">
            <div className="text-sm text-zinc-500 text-center py-8">
              L&apos;activite de votre equipe apparaitra ici.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
