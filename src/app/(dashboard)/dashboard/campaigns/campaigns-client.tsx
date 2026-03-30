"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Plus, Send, FileEdit, Clock, CheckCircle, PauseCircle, XCircle,
  Trash2, Sparkles, Info, Search, ChevronDown, ArrowUpDown,
  AtSign, Users, Eye, Pencil, Ban, CalendarClock, Mail,
  BarChart3, SendHorizonal,
} from "lucide-react";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { deleteCampaign, cancelCampaign } from "./actions";
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
  previewText: string | null;
  htmlContent: string | null;
  fromName: string | null;
  fromEmail: string | null;
  replyTo: string | null;
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
    totalDelivered: number;
    totalOpened: number;
    totalClicked: number;
    totalBounced: number;
    totalUnsubscribed: number;
  } | null;
  contactList: {
    name: string;
    contactCount: number;
  } | null;
  _count?: { recipients: number };
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState("");

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

  const selected = selectedId ? campaigns.find((c) => c.id === selectedId) : null;

  async function handleCancel(id: string) {
    setCancellingId(id);
    setCancelError("");
    const result = await cancelCampaign(id);
    setCancellingId(null);
    if (result?.error) setCancelError(result.error);
  }

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

      {/* Header */}
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

      {/* Info tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300/80">
          Selectionnez une campagne pour voir les details, editer le contenu ou lancer l&apos;envoi.
        </p>
      </div>

      {/* Filters row */}
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

      {/* Split panel */}
      {filtered.length > 0 ? (
        <div className="flex gap-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden min-h-[500px]">
          {/* Left: Campaign list */}
          <div className={`${selected ? "hidden lg:block lg:w-[380px]" : "w-full"} shrink-0 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto max-h-[700px]`}>
            {filtered.map((campaign) => {
              const status = statusConfig[campaign.status] ?? statusConfig.DRAFT;
              const StatusIcon = status.icon;
              const isSelected = selectedId === campaign.id;

              return (
                <button
                  key={campaign.id}
                  onClick={() => setSelectedId(campaign.id)}
                  className={`w-full text-left p-4 border-b border-zinc-100 dark:border-zinc-800/50 transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-orange-500/5 border-l-2 border-l-orange-500"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30 border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate pr-2">
                      {campaign.name}
                    </h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${status.className}`}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    {campaign.subject || "Sans sujet"}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                    {campaign._count?.recipients !== undefined && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {campaign._count.recipients}
                      </span>
                    )}
                    {campaign.scheduledAt && (
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {format(new Date(campaign.scheduledAt), "d MMM HH:mm", { locale: fr })}
                      </span>
                    )}
                    {!campaign.scheduledAt && (
                      <span>
                        {format(new Date(campaign.updatedAt), "d MMM yyyy", { locale: fr })}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: Campaign detail */}
          {selected ? (
            <CampaignDetailPanel
              campaign={selected}
              onClose={() => setSelectedId(null)}
              onDelete={(id) => setConfirmDeleteId(id)}
              onCancel={handleCancel}
              cancelling={cancellingId === selected.id}
              cancelError={cancelError}
            />
          ) : (
            <div className="hidden lg:flex flex-1 items-center justify-center text-center p-12">
              <div>
                <Mail className="h-12 w-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500 text-sm">
                  Selectionnez une campagne pour voir ses details
                </p>
              </div>
            </div>
          )}
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
          if (confirmDeleteId === selectedId) setSelectedId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

/* ─── Campaign Detail Panel ─── */

function CampaignDetailPanel({
  campaign,
  onClose,
  onDelete,
  onCancel,
  cancelling,
  cancelError,
}: {
  campaign: Campaign;
  onClose: () => void;
  onDelete: (id: string) => void;
  onCancel: (id: string) => void;
  cancelling: boolean;
  cancelError?: string;
}) {
  const status = statusConfig[campaign.status] ?? statusConfig.DRAFT;
  const StatusIcon = status.icon;
  const a = campaign.analytics;

  return (
    <div className="flex-1 overflow-y-auto max-h-[700px]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900/95 backdrop-blur border-b border-zinc-200 dark:border-zinc-800 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {campaign.name}
            </h2>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${status.className}`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {campaign.status === "DRAFT" && (
              <>
                <Link
                  href={`/dashboard/campaigns/${campaign.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Editer
                </Link>
                <Link
                  href={`/dashboard/campaigns/${campaign.id}/send`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors"
                >
                  <Send className="h-3 w-3" />
                  Envoyer
                </Link>
              </>
            )}
            {campaign.status === "SCHEDULED" && (
              <>
                <button
                  onClick={() => onCancel(campaign.id)}
                  disabled={cancelling}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-red-500 hover:border-red-500/30 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Ban className="h-3 w-3" />
                  Annuler
                </button>
                <Link
                  href={`/dashboard/campaigns/${campaign.id}/send`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <CalendarClock className="h-3 w-3" />
                  Replanifier
                </Link>
              </>
            )}
            {campaign.status === "SENDING" && (
              <button
                onClick={() => onCancel(campaign.id)}
                disabled={cancelling}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Ban className="h-3 w-3" />
                Annuler
              </button>
            )}
            <button
              onClick={() => onDelete(campaign.id)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {/* Mobile back button */}
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Fermer"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Cancel error */}
        {cancelError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
            {cancelError}
          </div>
        )}

        {/* Sender info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider font-medium">
            <AtSign className="h-3.5 w-3.5" />
            Expediteur
          </div>
          {campaign.fromEmail ? (
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
              <p className="text-sm text-zinc-900 dark:text-zinc-100">
                {campaign.fromName || "—"} &lt;{campaign.fromEmail}&gt;
              </p>
              {campaign.replyTo && (
                <p className="text-xs text-zinc-500 mt-0.5">
                  Reponses a : {campaign.replyTo}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-zinc-500 italic">Non configure</p>
          )}
        </div>

        {/* Subject + Preview */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider font-medium">
            <Mail className="h-3.5 w-3.5" />
            Sujet
          </div>
          <p className="text-sm text-zinc-900 dark:text-zinc-100">
            {campaign.subject || <span className="text-zinc-500 italic">Aucun sujet</span>}
          </p>
          {campaign.previewText && (
            <p className="text-xs text-zinc-400">
              Apercu : {campaign.previewText}
            </p>
          )}
        </div>

        {/* Schedule info */}
        {campaign.scheduledAt && (
          <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-blue-400" />
              <p className="text-sm text-blue-300">
                Planifie pour le {format(new Date(campaign.scheduledAt), "d MMMM yyyy 'a' HH:mm", { locale: fr })}
              </p>
            </div>
          </div>
        )}

        {/* Sending progress */}
        {campaign.status === "SENDING" && (
          <div className="p-4 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
              <p className="text-sm font-medium text-orange-400">Envoi en cours</p>
            </div>
            <p className="text-xs text-zinc-400">
              La campagne est en cours d&apos;envoi. Ce processus peut prendre quelques minutes.
            </p>
            {a && a.totalSent > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <SendHorizonal className="h-3.5 w-3.5" />
                    {a.totalSent} emails envoyes
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-orange-500 transition-all"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sent analytics */}
        {campaign.status === "SENT" && a && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider font-medium">
              <BarChart3 className="h-3.5 w-3.5" />
              Resultats
            </div>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Envoyes" value={a.totalSent} />
              <StatCard label="Delivres" value={a.totalDelivered} />
              <StatCard
                label="Ouverts"
                value={`${(a.openRate * 100).toFixed(1)}%`}
                sub={`${a.totalOpened} total`}
              />
              <StatCard
                label="Cliques"
                value={`${(a.clickRate * 100).toFixed(1)}%`}
                sub={`${a.totalClicked} total`}
              />
              {a.totalBounced > 0 && (
                <StatCard label="Rebonds" value={a.totalBounced} negative />
              )}
              {a.totalUnsubscribed > 0 && (
                <StatCard label="Desabonnes" value={a.totalUnsubscribed} negative />
              )}
            </div>
          </div>
        )}

        {/* Sent/completed timestamps */}
        {campaign.sentAt && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Send className="h-3 w-3" />
            Envoye le {format(new Date(campaign.sentAt), "d MMM yyyy 'a' HH:mm", { locale: fr })}
          </div>
        )}
        {campaign.completedAt && campaign.status === "SENT" && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <CheckCircle className="h-3 w-3" />
            Termine le {format(new Date(campaign.completedAt), "d MMM yyyy 'a' HH:mm", { locale: fr })}
          </div>
        )}

        {/* Content preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wider font-medium">
              <Eye className="h-3.5 w-3.5" />
              Apercu du contenu
            </div>
            {campaign.status === "DRAFT" && (
              <Link
                href={`/dashboard/campaigns/${campaign.id}/edit`}
                className="inline-flex items-center gap-1 text-xs text-orange-500 hover:text-orange-400 transition-colors"
              >
                <Pencil className="h-3 w-3" />
                Editer le contenu
              </Link>
            )}
          </div>
          {campaign.htmlContent ? (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white">
              <iframe
                srcDoc={campaign.htmlContent}
                className="w-full h-64 pointer-events-none"
                sandbox=""
                title="Apercu email"
              />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
              <FileEdit className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs text-zinc-500">Aucun contenu</p>
              {campaign.status === "DRAFT" && (
                <Link
                  href={`/dashboard/campaigns/${campaign.id}/edit`}
                  className="text-xs text-orange-500 hover:text-orange-400 mt-1 inline-block"
                >
                  Creer le contenu →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Audience */}
        {campaign.contactList && (
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Users className="h-3 w-3" />
            Audience : {campaign.contactList.name} ({campaign.contactList.contactCount} contacts)
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Stat Card ─── */

function StatCard({
  label,
  value,
  sub,
  negative,
}: {
  label: string;
  value: string | number;
  sub?: string;
  negative?: boolean;
}) {
  return (
    <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-semibold font-mono mt-0.5 ${negative ? "text-red-400" : "text-zinc-900 dark:text-zinc-100"}`}>
        {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
      </p>
      {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}
