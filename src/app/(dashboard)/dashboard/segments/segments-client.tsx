"use client";

import { useActionState, useState, useMemo } from "react";
import { Plus, Filter, Trash2, Sparkles, Search, ArrowUpDown, Users } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { createSegment, deleteSegment } from "./actions";
import { LimitWarningBanner } from "@/components/dashboard/feature-gate";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { FormDialog } from "@/components/dashboard/form-dialog";
import { PageHint } from "@/components/dashboard/page-hint";
import { TypedSelect } from "@/components/forms/typed-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { ActionState } from "@/types/action-state";

type SegmentData = {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
};

const SORT_KEYS = ["recent", "oldest", "name-asc", "name-desc"] as const;
type SortKey = (typeof SORT_KEYS)[number];
const SORT_LABELS: Record<SortKey, string> = {
  recent: "Plus récents",
  oldest: "Plus anciens",
  "name-asc": "Nom A-Z",
  "name-desc": "Nom Z-A",
};

const SUBSCRIPTION_FILTERS = ["all", "true", "false"] as const;
type SubscriptionFilter = (typeof SUBSCRIPTION_FILTERS)[number];
const SUBSCRIPTION_LABELS: Record<SubscriptionFilter, string> = {
  all: "Tous",
  true: "Abonnés uniquement",
  false: "Désabonnés uniquement",
};

export function SegmentsClient({
  segments,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  segments: SegmentData[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [filterSubscribed, setFilterSubscribed] = useState<SubscriptionFilter>("all");
  const [filterTags, setFilterTags] = useState("");
  const [filterEngagementMin, setFilterEngagementMin] = useState("");
  const [filterCreatedAfter, setFilterCreatedAfter] = useState("");

  function getFiltersJson() {
    const f: Record<string, unknown> = {};
    if (filterSubscribed === "true") f.subscribed = true;
    if (filterSubscribed === "false") f.subscribed = false;
    if (filterTags) f.includeTags = filterTags.split(",").map((t) => t.trim()).filter(Boolean);
    if (filterEngagementMin) f.engagementMin = Number(filterEngagementMin);
    if (filterCreatedAfter) f.createdAfter = filterCreatedAfter;
    return Object.keys(f).length > 0 ? JSON.stringify(f) : "";
  }
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [state, formAction, pending] = useActionState<
    ActionState,
    FormData
  >(
    async (prev, formData) => {
      const result = await createSegment(prev, formData);
      if (result?.success) setOpen(false);
      return result;
    },
    null
  );

  const filtered = useMemo(() => {
    let result = segments;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sort) {
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name-asc":
          return a.name.localeCompare(b.name, "fr");
        case "name-desc":
          return b.name.localeCompare(a.name, "fr");
        default:
          return 0;
      }
    });

    return result;
  }, [segments, search, sort]);

  return (
    <div className="space-y-6">
      {overLimit && limit !== -1 && (
        <LimitWarningBanner
          resourceLabel="segments"
          current={currentCount}
          limit={limit}
          planLabel={planLabel}
          actionLabel="Vous ne pouvez plus en créer. Passez au Pro pour des segments illimités."
        />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Segments
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Créez des segments dynamiques pour cibler vos contacts
          </p>
        </div>
        {canCreate ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Créer un segment
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500">
              {currentCount}/{limit === -1 ? "\u221E" : limit} segments
            </span>
            <Button asChild variant="outline-accent">
              <Link href="/dashboard/settings/billing">
                <Sparkles />
                Passer au Pro
              </Link>
            </Button>
          </div>
        )}
      </div>

      <PageHint>
        Les segments regroupent dynamiquement vos contacts selon des critères. Utilisez-les pour cibler vos campagnes vers une audience spécifique.
      </PageHint>

      {/* Search and sort controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un segment..."
            aria-label="Rechercher un segment"
            className="h-11 pl-9 sm:h-10"
          />
        </div>
        <TypedSelect values={SORT_KEYS} labels={SORT_LABELS} value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-48" aria-label="Trier les segments">
            {/* A div, not a span: the trigger line-clamps its direct span children. */}
            <div className="flex min-w-0 items-center gap-2">
              <ArrowUpDown className="h-4 w-4 shrink-0 text-zinc-400" />
              <SelectValue />
            </div>
          </SelectTrigger>
        </TypedSelect>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
        {filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Nom du segment</TableHead>
                <TableHead className="px-4">Description</TableHead>
                <TableHead className="px-4">Contacts</TableHead>
                <TableHead className="px-4">Date de création</TableHead>
                <TableHead className="px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((segment) => (
                <SegmentRow key={segment.id} segment={segment} />
              ))}
            </TableBody>
          </Table>
        ) : segments.length > 0 && filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Aucun segment ne correspond à votre recherche.
            </p>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Filter className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-2">
              Aucun segment pour le moment.
            </p>
            <p className="text-zinc-400 text-xs">
              Créez un segment dynamique pour regrouper automatiquement vos
              contacts selon des critères.
            </p>
          </div>
        )}
      </div>

      {/* Create modal */}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Nouveau segment"
        action={formAction}
        error={state?.error}
        pending={pending}
        submit={{ label: "Créer", pendingLabel: "Création..." }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="segment-name">Nom</Label>
          <Input
            id="segment-name"
            name="name"
            required
            placeholder="ex: Clients actifs, Prospects..."
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="segment-description">Description</Label>
          <Textarea
            id="segment-description"
            name="description"
            rows={3}
            className="min-h-0 resize-none"
            placeholder="Description optionnelle..."
          />
        </div>
        {/* Dynamic filters */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 space-y-3">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Filtres dynamiques</p>
          <div className="space-y-1.5">
            <Label htmlFor="segment-filter-subscribed" className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Statut abonnement</Label>
            <TypedSelect values={SUBSCRIPTION_FILTERS} labels={SUBSCRIPTION_LABELS} value={filterSubscribed} onValueChange={setFilterSubscribed}>
              <SelectTrigger id="segment-filter-subscribed">
                <SelectValue />
              </SelectTrigger>
            </TypedSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="segment-filter-tags" className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Tags (séparés par des virgules)</Label>
            <Input id="segment-filter-tags" value={filterTags} onChange={(e) => setFilterTags(e.target.value)} placeholder="vip, client" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="segment-filter-engagement" className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Score engagement min</Label>
              <Input id="segment-filter-engagement" type="number" value={filterEngagementMin} onChange={(e) => setFilterEngagementMin(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="segment-filter-created-after" className="text-xs font-normal text-zinc-500 dark:text-zinc-400">Créés après</Label>
              <Input id="segment-filter-created-after" type="date" value={filterCreatedAfter} onChange={(e) => setFilterCreatedAfter(e.target.value)} className="cursor-pointer" />
            </div>
          </div>
        </div>
        <input type="hidden" name="filters" value={getFiltersJson()} />
      </FormDialog>
    </div>
  );
}

function SegmentRow({ segment }: { segment: SegmentData }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    setConfirmOpen(false);
    setDeleting(true);
    try {
      const result = await deleteSegment(segment.id);
      if (result?.error) toast.error(result.error);
      else toast.success("Segment supprimé.");
    } catch {
      toast.error("Impossible de supprimer le segment.");
    } finally {
      setDeleting(false);
    }
  }

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(segment.createdAt));

  return (
    <>
      <TableRow>
        <TableCell className="px-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-orange-500" />
            <Link href={`/dashboard/segments/${segment.id}`} className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors">
              {segment.name}
            </Link>
          </div>
        </TableCell>
        <TableCell className="px-4 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
          {segment.description || "\u2014"}
        </TableCell>
        <TableCell className="px-4">
          <Badge className="gap-1.5 px-2.5 py-1 text-orange-500 dark:text-orange-500 [&_svg]:size-3.5">
            <Users />
            <span className="text-sm font-semibold font-mono">{segment.contactCount}</span>
          </Badge>
        </TableCell>
        <TableCell className="px-4 text-sm text-zinc-500">{formattedDate}</TableCell>
        <TableCell className="px-4 text-right">
          <Button
            variant="ghost-destructive"
            size="sm"
            onClick={() => setConfirmOpen(true)}
            disabled={deleting}
          >
            <Trash2 />
            {deleting ? "..." : "Supprimer"}
          </Button>
        </TableCell>
      </TableRow>
      <ConfirmDialog
        open={confirmOpen}
        title="Supprimer le segment"
        message={`Êtes-vous sûr de vouloir supprimer le segment "${segment.name}" ? Cette action est irréversible.`}
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
        destructive
      />
    </>
  );
}
