"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Send, FileEdit, Clock, CheckCircle, PauseCircle, XCircle, Trash2, Sparkles, Info, Search, ChevronDown, ArrowUpDown } from "lucide-react";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { deleteCampaign } from "./actions";
import { LimitWarningBanner } from "@/components/dashboard/feature-gate";

type CampaignSort = "date-desc" | "date-asc" | "name-asc" | "open-rate";

const campaignSortOptions: { label: string; value: CampaignSort }[] = [
  { label: "Plus recentes", value: "date-desc" },
  { label: "Plus anciennes", value: "date-asc" },
  { label: "Nom A-Z", value: "name-asc" },
  { label: "Taux d'ouverture", value: "open-rate" },
];

type Campaign = {
  id: string;
  name: string;
  subject: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  analytics: {
    openRate: number;
    clickRate: number;
    totalSent: number;
  } | null;
  contactList: {
    name: string;
    contactCount: number;
  } | null;
  [key: string]: unknown;
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  DRAFT: { label: "Brouillon", icon: FileEdit, className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400" },
  SCHEDULED: { label: "Planifiee", icon: Clock, className: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  SENDING: { label: "En cours", icon: Send, className: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  SENT: { label: "Envoyee", icon: CheckCircle, className: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  PAUSED: { label: "Pausee", icon: PauseCircle, className: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  CANCELLED: { label: "Annulee", icon: XCircle, className: "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400" },
};

const filterOptions = [
  { label: "Toutes", value: "ALL" },
  { label: "Brouillons", value: "DRAFT" },
  { label: "Planifiees", value: "SCHEDULED" },
  { label: "En cours", value: "SENDING" },
  { label: "Envoyees", value: "SENT" },
  { label: "Archivees", value: "CANCELLED" },
];

export function CampaignsClient({
  campaigns,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  campaigns: Campaign[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<CampaignSort>("date-desc");
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    let result = campaigns.filter((c) => {
      const matchesFilter = filter === "ALL" || c.status === filter;
      const matchesSearch = c.name.toLowerCase().includes(lowerSearch);
      return matchesFilter && matchesSearch;
    });

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "open-rate":
          return (b.analytics?.openRate ?? 0) - (a.analytics?.openRate ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [campaigns, filter, search, sortBy]);

  return (
    <div className="space-y-6">
      {overLimit && limit !== -1 && (
        <LimitWarningBanner
          resourceLabel="campagnes actives"
          current={currentCount}
          limit={limit}
          planLabel={planLabel}
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Campagnes</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gerez et suivez vos campagnes email
          </p>
        </div>
        {canCreate ? (
          <Link
            href="/dashboard/campaigns/new"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nouvelle campagne
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {currentCount}/{limit === -1 ? "\u221E" : limit} campagnes actives
            </span>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-2 bg-orange-600/20 text-orange-400 border border-orange-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-orange-600/30"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Passer au Pro
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300/80">
          Creez et envoyez des campagnes email. Choisissez un expediteur, redigez votre contenu, selectionnez votre audience et planifiez l&apos;envoi.
        </p>
      </div>

      {/* Search + Sort row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une campagne..."
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
          />
        </div>

        {/* Sort dropdown */}
        <div className="relative">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {campaignSortOptions.find((s) => s.value === sortBy)?.label}
            <ChevronDown className="h-3 w-3" />
          </button>
          {sortDropdownOpen && (
            <div className="absolute z-20 top-full mt-1 right-0 min-w-[170px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1">
              {campaignSortOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSortBy(opt.value); setSortDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                    sortBy === opt.value ? "text-orange-500 bg-orange-500/5" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
              filter === opt.value
                ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((campaign) => {
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

                  <div className="flex items-center gap-4">
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

                    {campaign.status === "DRAFT" && (
                      <Link
                        href={`/dashboard/campaigns/${campaign.id}/send`}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                        title="Envoyer"
                      >
                        <Send className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(campaign.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
          <Send className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm mb-4">
            {search
              ? `Aucun resultat pour "${search}".`
              : filter === "ALL"
                ? "Aucune campagne creee pour le moment."
                : `Aucune campagne avec le statut "${filterOptions.find((o) => o.value === filter)?.label}".`}
          </p>
          {filter === "ALL" && (
            <Link
              href="/dashboard/campaigns/new"
              className="text-orange-500 hover:text-orange-400 text-sm font-medium"
            >
              Creer votre premiere campagne
            </Link>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Supprimer cette campagne"
        message="Cette action est irreversible. La campagne sera definitivement supprimee."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        onConfirm={() => {
          if (confirmDeleteId) deleteCampaign(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
