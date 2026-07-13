"use client";

import { FormEvent, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageDetailSheet } from "./message-detail-sheet";
import { MessageTable } from "./message-table";
import type { ApiMessageDetail } from "./message-types";

type MessageFilters = {
  query: string;
  channel: string;
  origin: string;
  status: string;
  page: number;
};

export function PlatformMessagesPanel({
  messages,
  total,
  pageCount,
  filters,
}: {
  messages: ApiMessageDetail[];
  total: number;
  pageCount: number;
  filters: MessageFilters;
}) {
  const [selectedMessage, setSelectedMessage] = useState<ApiMessageDetail | null>(null);
  const [query, setQuery] = useState(filters.query);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilters(next: Partial<MessageFilters>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...filters, ...next };
    for (const [key, value] of Object.entries(merged)) {
      if (key === "page") {
        if (value && value !== 1) params.set(key, String(value));
        else params.delete(key);
        continue;
      }
      if (value) params.set(key, String(value));
      else params.delete(key);
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters({ query: query.trim(), page: 1 });
  }

  const hasFilters = Boolean(filters.query || filters.channel || filters.origin || filters.status);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle>Registre des communications</CardTitle>
              <CardDescription>
                Messages directs et API. Les communications de campagne restent dans leur espace dédié.
              </CardDescription>
            </div>
            <p className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{total.toLocaleString("fr-FR")} résultat{total > 1 ? "s" : ""}</p>
          </div>
          <form className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_10rem_10rem_10rem_auto]" onSubmit={submitSearch}>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 pl-9" placeholder="Destinataire ou identifiant fournisseur" aria-label="Rechercher une communication" />
            </div>
            <Select value={filters.channel || "all"} onValueChange={(value) => updateFilters({ channel: value === "all" ? "" : value, page: 1 })}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Canal" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tous les canaux</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="sms">SMS</SelectItem></SelectContent>
            </Select>
            <Select value={filters.origin || "all"} onValueChange={(value) => updateFilters({ origin: value === "all" ? "" : value, page: 1 })}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Origine" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Toutes les origines</SelectItem><SelectItem value="platform">Plateforme</SelectItem><SelectItem value="api">API</SelectItem><SelectItem value="legacy">Héritée</SelectItem></SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={(value) => updateFilters({ status: value === "all" ? "" : value, page: 1 })}>
              <SelectTrigger className="h-10"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="queued">En attente</SelectItem><SelectItem value="sent">Envoyé</SelectItem><SelectItem value="delivered">Délivré</SelectItem><SelectItem value="read">Lu</SelectItem><SelectItem value="failed">Échec</SelectItem></SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="h-10 min-w-10 px-3" disabled={isPending}><SlidersHorizontal className="size-4" /><span className="sr-only">Appliquer les filtres</span></Button>
              {hasFilters ? <Button type="button" variant="ghost" size="icon" className="h-10 w-10" onClick={() => { setQuery(""); updateFilters({ query: "", channel: "", origin: "", status: "", page: 1 }); }} aria-label="Effacer les filtres"><X className="size-4" /></Button> : null}
            </div>
          </form>
        </CardHeader>
        <CardContent className="p-0" aria-busy={isPending}>
          <MessageTable messages={messages} onSelect={setSelectedMessage} />
          <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Page <span className="font-mono tabular-nums">{filters.page}</span> sur <span className="font-mono tabular-nums">{pageCount}</span></p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => updateFilters({ page: filters.page - 1 })} disabled={isPending || filters.page <= 1}><ChevronLeft className="size-4" />Précédent</Button>
              <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => updateFilters({ page: filters.page + 1 })} disabled={isPending || filters.page >= pageCount}>Suivant<ChevronRight className="size-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <MessageDetailSheet
        message={selectedMessage}
        onOpenChange={(open) => {
          if (!open) setSelectedMessage(null);
        }}
      />
    </>
  );
}

export type { ApiMessageDetail } from "./message-types";
