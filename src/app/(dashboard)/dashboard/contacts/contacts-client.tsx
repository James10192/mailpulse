"use client";

import { useState, useMemo } from "react";
import { Plus, Upload, Search, Trash2, Users, Sparkles, Info, ChevronDown, Tag, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { AddContactPanel } from "@/components/dashboard/add-contact-panel";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { deleteContact } from "./actions";
import { LimitWarningBanner } from "@/components/dashboard/feature-gate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type SubscriptionFilter = "ALL" | "SUBSCRIBED" | "UNSUBSCRIBED";
type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-za" | "score-desc";

const subscriptionFilters: { label: string; value: SubscriptionFilter }[] = [
  { label: "Tous", value: "ALL" },
  { label: "Abonnés", value: "SUBSCRIBED" },
  { label: "Désabonnés", value: "UNSUBSCRIBED" },
];

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Plus récents", value: "date-desc" },
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

  const deleteButtonClass =
    "h-8 w-8 text-zinc-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-500 [&_svg]:size-3.5";
  const filterActiveClass =
    "border-orange-500/30 bg-orange-500/10 text-orange-600 shadow-none hover:bg-orange-500/15 dark:bg-orange-500/10 dark:text-orange-400 dark:hover:bg-orange-500/15";

  return (
    <>
      <div className="page-stack app-shell-safe">
        {overLimit && limit !== -1 && (
          <LimitWarningBanner
            resourceLabel="contacts"
            current={currentCount}
            limit={limit}
            planLabel={planLabel}
            actionLabel="Vous ne pouvez plus en ajouter. Passez au Pro pour des contacts illimités."
          />
        )}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Contacts
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Gérez vos listes de contacts et segments
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {canCreate ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/dashboard/contacts/import">
                    <Upload className="h-4 w-4" />
                    Importer CSV
                  </Link>
                </Button>
                <Button onClick={() => setPanelOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Ajouter
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500">
                  {currentCount}/{limit === -1 ? "\u221E" : limit} contacts
                </span>
                <Button asChild variant="outline" className={filterActiveClass}>
                  <Link href="/dashboard/settings/billing">
                    <Sparkles className="h-3.5 w-3.5" />
                    Passer au Pro
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        <Alert className="flex items-start gap-3 rounded-xl p-4">
          <Info className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <AlertDescription className="text-zinc-600 dark:text-zinc-400">
            Gérez votre base de contacts. Ajoutez des contacts manuellement, via les pages de capture, ou par import CSV. Les tags permettent de segmenter votre audience.
          </AlertDescription>
        </Alert>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Total contacts", value: stats.total },
            { label: "Abonnés", value: stats.subscribed },
            { label: "Désabonnés", value: stats.unsubscribed },
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
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 lg:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un contact..."
                  aria-label="Rechercher un contact"
                  className="h-10 pl-10 pr-4"
                />
              </div>

              {/* Tag filter dropdown */}
              <DropdownMenu
                open={tagDropdownOpen}
                onOpenChange={(next) => {
                  setTagDropdownOpen(next);
                  if (next) setSortDropdownOpen(false);
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full sm:w-auto justify-between font-normal ${
                      tagFilter !== "ALL" ? filterActiveClass : "text-zinc-500"
                    }`}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {tagFilter === "ALL" ? "Tags" : allTags.find((t) => t.id === tagFilter)?.name}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                  <DropdownMenuRadioGroup value={tagFilter} onValueChange={setTagFilter}>
                    <DropdownMenuRadioItem value="ALL" className="text-xs">
                      Tous les tags
                    </DropdownMenuRadioItem>
                    {allTags.length > 0 && <DropdownMenuSeparator />}
                    {allTags.map((tag) => (
                      <DropdownMenuRadioItem key={tag.id} value={tag.id} className="text-xs">
                        {tag.name}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Sort dropdown */}
              <DropdownMenu
                open={sortDropdownOpen}
                onOpenChange={(next) => {
                  setSortDropdownOpen(next);
                  if (next) setTagDropdownOpen(false);
                }}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto justify-between font-normal text-zinc-500"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortOptions.find((s) => s.value === sortBy)?.label}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[160px]">
                  <DropdownMenuRadioGroup
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as SortOption)}
                  >
                    {sortOptions.map((opt) => (
                      <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Subscription status filter buttons */}
            <ToggleGroup
              type="single"
              value={subscriptionFilter}
              onValueChange={(value) => {
                if (value) setSubscriptionFilter(value as SubscriptionFilter);
              }}
              aria-label="Filtrer par statut d'abonnement"
              className="flex-wrap gap-2"
            >
              {subscriptionFilters.map((opt) => (
                <ToggleGroupItem
                  key={opt.value}
                  value={opt.value}
                  variant="outline"
                  size="sm"
                  className="h-8 rounded-lg px-3 text-xs font-normal text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100 data-[state=on]:border-orange-500/30 data-[state=on]:bg-orange-500/10 data-[state=on]:text-orange-600 dark:data-[state=on]:text-orange-400"
                >
                  {opt.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {filtered.length > 0 ? (
            <>
            <div className="grid grid-cols-1 gap-3 p-4 md:hidden">
              {filtered.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/30 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="block text-sm font-mono text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors break-all"
                      >
                        {contact.email}
                      </Link>
                      <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {[contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Sans nom"}
                      </div>
                    </div>
                    <Badge
                      variant={contact.subscribed ? "success" : "destructive"}
                      className="shrink-0 text-xs"
                    >
                      {contact.subscribed ? "Abonné" : "Désabonné"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Score engagement</span>
                    <span className="font-mono">{contact.engagementScore}</span>
                  </div>

                  {contact.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {contact.tags.map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="rounded px-1.5 text-[10px] font-normal"
                        >
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmDeleteId(contact.id)}
                      disabled={deleting === contact.id}
                      className={deleteButtonClass}
                      title="Supprimer"
                      aria-label={`Supprimer ${contact.email}`}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent dark:hover:bg-transparent">
                    <TableHead className="px-4 py-3">Email</TableHead>
                    <TableHead className="px-4 py-3">Nom</TableHead>
                    <TableHead className="px-4 py-3 hidden md:table-cell">Tags</TableHead>
                    <TableHead className="px-4 py-3 hidden sm:table-cell">Score</TableHead>
                    <TableHead className="px-4 py-3">Statut</TableHead>
                    <TableHead className="px-4 py-3 w-12 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="dark:hover:bg-zinc-800/30"
                    >
                      <TableCell className="px-4 py-3 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                        <Link
                          href={`/dashboard/contacts/${contact.id}`}
                          className="hover:text-orange-500 transition-colors"
                        >
                          {contact.email}
                        </Link>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                        {contact.firstName} {contact.lastName}
                      </TableCell>
                      <TableCell className="px-4 py-3 hidden md:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {contact.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="rounded px-1.5 text-[10px] font-normal"
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-sm font-mono text-zinc-500 hidden sm:table-cell">
                        {contact.engagementScore}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <Badge
                          variant={contact.subscribed ? "success" : "destructive"}
                          className="text-xs"
                        >
                          {contact.subscribed ? "Abonné" : "Désabonné"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDeleteId(contact.id)}
                          disabled={deleting === contact.id}
                          className={deleteButtonClass}
                          title="Supprimer"
                          aria-label={`Supprimer ${contact.email}`}
                        >
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            </>
          ) : contacts.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">
                Aucun contact pour le moment.
              </p>
              <Button variant="link" onClick={() => setPanelOpen(true)}>
                Ajouter votre premier contact
              </Button>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-zinc-500">
              Aucun résultat pour &quot;{search}&quot;
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
        message="Cette action est irréversible. Le contact sera définitivement supprimé."
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
