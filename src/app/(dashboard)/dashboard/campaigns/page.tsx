import Link from "next/link";
import { Plus, Send, Clock, FileEdit, CheckCircle, PauseCircle, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  DRAFT: { label: "Brouillon", icon: FileEdit, className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" },
  SCHEDULED: { label: "Planifiee", icon: Clock, className: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  SENDING: { label: "En cours", icon: Send, className: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  SENT: { label: "Envoyee", icon: CheckCircle, className: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  PAUSED: { label: "Pausee", icon: PauseCircle, className: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  CANCELLED: { label: "Annulee", icon: XCircle, className: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" },
};

async function getCampaigns() {
  return prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      analytics: true,
      contactList: { select: { name: true, contactCount: true } },
    },
  });
}

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Campagnes</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gerez et suivez vos campagnes email
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle campagne
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["Toutes", "Brouillons", "Planifiees", "Envoyees"].map((filter, i) => (
          <button
            key={filter}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              i === 0
                ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {campaigns.length > 0 ? (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const status = statusConfig[campaign.status] ?? statusConfig.DRAFT;
            const StatusIcon = status.icon;
            return (
              <div
                key={campaign.id}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {campaign.name}
                      </h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${status.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
                      {campaign.subject && <span>Sujet: {campaign.subject}</span>}
                      {campaign.contactList && (
                        <span>Liste: {campaign.contactList.name} ({campaign.contactList.contactCount})</span>
                      )}
                      <span>{new Date(campaign.createdAt).toLocaleDateString("fr-FR")}</span>
                    </div>
                  </div>

                  {campaign.analytics && (
                    <div className="hidden sm:flex items-center gap-6 text-xs font-mono">
                      <div className="text-center">
                        <div className="text-zinc-500">Opens</div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {(campaign.analytics.openRate * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-zinc-500">Clicks</div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {(campaign.analytics.clickRate * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-zinc-500">Envoyes</div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {campaign.analytics.totalSent.toLocaleString("fr-FR")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
          <Send className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm mb-4">Aucune campagne creee pour le moment.</p>
          <Link
            href="/dashboard/campaigns/new"
            className="text-orange-500 hover:text-orange-400 text-sm font-medium"
          >
            Creer votre premiere campagne
          </Link>
        </div>
      )}
    </div>
  );
}
