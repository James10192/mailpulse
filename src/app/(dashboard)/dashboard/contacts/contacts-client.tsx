"use client";

import { useState, useMemo } from "react";
import { Plus, Upload, Search, Trash2, Users, Sparkles, Info, ChevronDown, Tag, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { AddContactPanel } from "@/components/dashboard/add-contact-panel";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { deleteContact } from "./actions";
import { LimitWarningBanner } from "@/components/dashboard/feature-gate";

type SubscriptionFilter = "ALL" | "SUBSCRIBED" | "UNSUBSCRIBED";
type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-za" | "score-desc";

const subscriptionFilters: { label: string; value: SubscriptionFilter }[] = [
  { label: "Tous", value: "ALL" },
  { label: "Abonnes", value: "SUBSCRIBED" },
  { label: "Desabonnes", value: "UNSUBSCRIBED" },
];

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Plus recents", value: "date-desc" },
  { label: "Plus anciens", value: "date-asc" },
  { label: "Nom A-Z", value: "name-asc" },
  { label: "Nom Z-A", value: "name-za" },
  { label: "Score engagement", value: "score-desc" },
];

interface ContactData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  subscribed: boolean;
  engagementScore: number;
  createdAt: string;
  tags: { id: string; name: string; color: string }[];
}

export function ContactsClient({
  stats,
  contacts,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  stats: { total: number; subscribed: number; unsubscribed: number };
  contacts: ContactData[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilter>("ALL");
  const [tagFilter, setTagFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Collect all unique tags from contacts
  const allTags = useMemo(() => {
    const tagMap = new Map<string, { id: string; name: string; color: string }>();
    for (const c of contacts) {
      for (const tag of c.tags) {
        if (!tagMap.has(tag.id)) tagMap.set(tag.id, tag);
      }
    }
    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [contacts]);

  const filtered = useMemo(() => {
    const lowerSearch = search.toLowerCase();
    let result = contacts.filter((c) => {
      // Search filter
      const matchesSearch =
        c.email.toLowerCase().includes(lowerSearch) ||
        (c.firstName?.toLowerCase() ?? "").includes(lowerSearch) ||
        (c.lastName?.toLowerCase() ?? "").includes(lowerSearch);
      // Subscription filter
      const matchesSub =
        subscriptionFilter === "ALL" ||
        (subscriptionFilter === "SUBSCRIBED" && c.subscribed) ||
        (subscriptionFilter === "UNSUBSCRIBED" && !c.subscribed);
      // Tag filter
      const matchesTag =
        tagFilter === "ALL" || c.tags.some((t) => t.id === tagFilter);
      return matchesSearch && matchesSub && matchesTag;
    });

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "date-asc":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name-asc":
          return (a.firstName ?? "").localeCompare(b.firstName ?? "");
        case "name-za":
          return (b.firstName ?? "").localeCompare(a.firstName ?? "");
        case "score-desc":
          return b.engagementScore - a.engagementScore;
        default:
          return 0;
      }
    });

    return result;
  }, [contacts, search, subscriptionFilter, tagFilter, sortBy]);

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    const result = await deleteContact(id);
    setDeleting(null);
    if (result?.error) {
      setDeleteError(result.error);
    }
  }

  return (
    <>
      <div className="space-y-6">
        {overLimit && limit !== -1 && (
          <LimitWarningBanner
            resourceLabel="contacts"
            current={currentCount}
            limit={limit}
            planLabel={planLabel}
            actionLabel="Vous ne pouvez plus en ajouter. Passez au Pro pour des contacts illimites."
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Contacts
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Gerez vos listes de contacts et segments
            </p>
          </div>
          <div className="flex gap-2">
            {canCreate ? (
              <>
                <button className="inline-flex items-center gap-2 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors bg-white dark:bg-transparent cursor-pointer">
                  <Upload className="h-4 w-4" />
                  Importer CSV
                </button>
                <button
                  onClick={() => setPanelOpen(true)}
                  className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Ajouter
                </button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  {currentCount}/{limit === -1 ? "\u221E" : limit} contacts
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
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-300/80">
            Gerez votre base de contacts. Ajoutez des contacts manuellement, via les pages de capture, ou par import CSV. Les tags permettent de segmenter votre audience.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total contacts", value: stats.total },
            { label: "Abonnes", value: stats.subscribed },
            { label: "Desabonnes", value: stats.unsubscribed },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
            >
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                {stat.label}
              </div>
              <div className="text-xl font-semibold font-mono mt-1 text-zinc-900 dark:text-zinc-100">
                {stat.value.toLocaleString("fr-FR")}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un contact..."
                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>

              {/* Tag filter dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setTagDropdownOpen(!tagDropdownOpen); setSortDropdownOpen(false); }}
                  className={`inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border transition-colors cursor-pointer ${
                    tagFilter !== "ALL"
                      ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
                  {tagFilter === "ALL" ? "Tags" : allTags.find((t) => t.id === tagFilter)?.name}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {tagDropdownOpen && (
                  <div className="absolute z-20 top-full mt-1 left-0 min-w-[160px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1">
                    <button
                      onClick={() => { setTagFilter("ALL"); setTagDropdownOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                        tagFilter === "ALL" ? "text-orange-500 bg-orange-500/5" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      }`}
                    >
                      Tous les tags
                    </button>
                    {allTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => { setTagFilter(tag.id); setTagDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                          tagFilter === tag.id ? "text-orange-500 bg-orange-500/5" : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => { setSortDropdownOpen(!sortDropdownOpen); setTagDropdownOpen(false); }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  {sortOptions.find((s) => s.value === sortBy)?.label}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {sortDropdownOpen && (
                  <div className="absolute z-20 top-full mt-1 right-0 min-w-[160px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg py-1">
                    {sortOptions.map((opt) => (
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

            {/* Subscription status filter buttons */}
            <div className="flex gap-2 flex-wrap">
              {subscriptionFilters.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSubscriptionFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer ${
                    subscriptionFilter === opt.value
                      ? "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Email
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Nom
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Tags
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                      Score
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Statut
                    </th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {filtered.map((contact) => (
                    <tr
                      key={contact.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                        {contact.email}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                        {contact.firstName} {contact.lastName}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            >
                              {tag.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-zinc-500 hidden sm:table-cell">
                        {contact.engagementScore}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            contact.subscribed
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {contact.subscribed ? "Abonne" : "Desabonne"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setConfirmDeleteId(contact.id)}
                          disabled={deleting === contact.id}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">
                Aucun contact pour le moment.
              </p>
              <button
                onClick={() => setPanelOpen(true)}
                className="text-orange-500 hover:text-orange-400 text-sm font-medium cursor-pointer"
              >
                Ajouter votre premier contact
              </button>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-zinc-500">
              Aucun resultat pour &quot;{search}&quot;
            </div>
          )}
        </div>
      </div>

      <AddContactPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        availableTags={allTags.map((t) => t.name)}
      />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Supprimer ce contact"
        message="Cette action est irreversible. Le contact sera definitivement supprime."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <ConfirmDialog
        open={deleteError !== null}
        title="Erreur"
        message={deleteError ?? ""}
        confirmLabel="OK"
        onConfirm={() => setDeleteError(null)}
        onCancel={() => setDeleteError(null)}
      />
    </>
  );
}
