"use client";

import { FormEvent, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  MESSAGE_OUTCOMES,
  OUTCOME_ORDER,
  messageStatusLabel,
  type MessageOutcome,
} from "@/lib/mailpulse/message-outcomes";
import { cn } from "@/lib/utils";
import { MESSAGE_PERIODS, type MessageFilters } from "./message-filters";
import { MessageDetailSheet } from "./message-detail-sheet";
import { MessageTable } from "./message-table";
import type { ApiMessageDetail } from "./message-types";

type KeyOption = { id: string; name: string; revoked: boolean };
type ApplicationOption = { id: string; name: string };
type SenderOption = { key: string; label: string };

const TONE_DOT: Record<string, string> = {
  success: "bg-emerald-500",
  secondary: "bg-zinc-400",
  warning: "bg-amber-500",
  destructive: "bg-red-500",
  outline: "bg-zinc-300 dark:bg-zinc-600",
};

const ALL = "all";

export function PlatformMessagesPanel({
  messages,
  linkedMessage,
  total,
  pageCount,
  filters,
  outcomeCounts,
  keyOptions,
  applicationOptions,
  senderOptions,
  personalDataMasked,
}: {
  messages: ApiMessageDetail[];
  /** The message named by `?message=` in the URL, opened on arrival. */
  linkedMessage: ApiMessageDetail | null;
  total: number;
  pageCount: number;
  filters: MessageFilters;
  outcomeCounts: Record<MessageOutcome, number>;
  keyOptions: KeyOption[];
  applicationOptions: ApplicationOption[];
  senderOptions: SenderOption[];
  personalDataMasked: boolean;
}) {
  const [selectedMessage, setSelectedMessage] = useState<ApiMessageDetail | null>(linkedMessage);
  const [query, setQuery] = useState(filters.query);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateFilters(next: Partial<MessageFilters>) {
    const params = new URLSearchParams(searchParams.toString());
    const merged = { ...filters, ...next };
    for (const [name, value] of Object.entries(merged)) {
      const isDefault = (name === "page" && value === 1) || (name === "period" && value === "30d");
      if (value && !isDefault) params.set(name, String(value));
      else params.delete(name);
    }
    params.set("tab", "messages");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  // The open message is in the URL, so it can be shared; the history API keeps
  // the server from reloading the whole registry for it.
  function openMessage(message: ApiMessageDetail | null) {
    setSelectedMessage(message);
    const params = new URLSearchParams(window.location.search);
    if (message) params.set("message", message.id);
    else params.delete("message");
    window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilters({ query: query.trim(), page: 1 });
  }

  const selectionTotal = OUTCOME_ORDER.reduce((sum, outcome) => sum + outcomeCounts[outcome], 0);
  const hasFilters = Boolean(filters.query || filters.channel || filters.origin || filters.outcome || filters.status || filters.key || filters.application || filters.sender || filters.period !== "30d");
  const selectedKey = keyOptions.find((key) => key.id === filters.key);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle>Registre des messages</CardTitle>
              <CardDescription>
                {selectedKey ? <>Messages envoyés avec la clé <span className="font-medium text-foreground">{selectedKey.name}</span>. </> : "Messages directs et API. "}
                Cliquez sur un message pour suivre son parcours.
                {personalDataMasked ? " Destinataires et contenus sont masqués : ils sont réservés aux propriétaires et administrateurs." : null}
              </CardDescription>
            </div>
            <p className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {total.toLocaleString("fr-FR")} message{total > 1 ? "s" : ""}
            </p>
          </div>

          <ToggleGroup
            type="single"
            value={filters.outcome}
            onValueChange={(value) => updateFilters({ outcome: value as MessageOutcome | "", status: "", page: 1 })}
            aria-label="Filtrer par issue"
            className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5"
          >
            {OUTCOME_ORDER.map((outcome) => {
              const info = MESSAGE_OUTCOMES[outcome];
              const count = outcomeCounts[outcome];
              const share = selectionTotal > 0 ? Math.round((count / selectionTotal) * 100) : 0;
              return (
                <ToggleGroupItem
                  key={outcome}
                  value={outcome}
                  variant="outline"
                  title={info.hint}
                  aria-label={`${info.label} : ${count}`}
                  className="h-auto min-w-0 flex-col items-stretch gap-1 rounded-lg bg-card px-3 py-2.5 text-left hover:bg-muted/40 hover:text-foreground data-[state=on]:border-orange-500/60 data-[state=on]:bg-orange-500/5 data-[state=on]:text-foreground"
                >
                  <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">
                    <span className={cn("size-2 shrink-0 rounded-full", TONE_DOT[info.tone])} aria-hidden="true" />
                    {info.label}
                  </span>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-lg font-semibold tabular-nums">{count.toLocaleString("fr-FR")}</span>
                    <span className="font-mono text-xs font-normal text-muted-foreground tabular-nums">{share} %</span>
                  </span>
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>

          <div className="grid gap-2 lg:grid-cols-[minmax(14rem,1fr)_11rem_13rem_9rem_10.5rem]">
            <form className="relative" onSubmit={submitSearch} role="search">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 pl-9" placeholder={personalDataMasked ? "Identifiant du message" : "Destinataire, contact ou identifiant"} aria-label="Rechercher un message" />
            </form>
            <Select value={filters.period} onValueChange={(value) => updateFilters({ period: value as MessageFilters["period"], page: 1 })}>
              <SelectTrigger className="h-10" aria-label="Période"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(MESSAGE_PERIODS).map(([value, period]) => <SelectItem key={value} value={value}>{period.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.key || ALL} onValueChange={(value) => updateFilters({ key: value === ALL ? "" : value, page: 1 })}>
              <SelectTrigger className="h-10" aria-label="Clé API"><SelectValue placeholder="Clé API" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toutes les clés</SelectItem>
                {keyOptions.map((key) => <SelectItem key={key.id} value={key.id}>{key.name}{key.revoked ? " (révoquée)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.channel || ALL} onValueChange={(value) => updateFilters({ channel: value === ALL ? "" : value, page: 1 })}>
              <SelectTrigger className="h-10" aria-label="Canal"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL}>Tous canaux</SelectItem><SelectItem value="email">Email</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="sms">SMS</SelectItem></SelectContent>
            </Select>
            <Select value={filters.origin || ALL} onValueChange={(value) => updateFilters({ origin: value === ALL ? "" : value, page: 1 })}>
              <SelectTrigger className="h-10" aria-label="Origine"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={ALL}>Toutes origines</SelectItem><SelectItem value="api">API</SelectItem><SelectItem value="platform">Plateforme</SelectItem><SelectItem value="legacy">Héritée</SelectItem></SelectContent>
            </Select>
          </div>

          {applicationOptions.length > 0 || senderOptions.length > 1 || filters.application || filters.sender ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:max-w-xl">
              {applicationOptions.length > 0 || filters.application ? (
                <Select value={filters.application || ALL} onValueChange={(value) => updateFilters({ application: value === ALL ? "" : value, page: 1 })}>
                  <SelectTrigger className="h-10" aria-label="Application"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Toutes les applications</SelectItem>
                    {applicationOptions.map((application) => <SelectItem key={application.id} value={application.id}>{application.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}
              {senderOptions.length > 1 || filters.sender ? (
                <Select value={filters.sender || ALL} onValueChange={(value) => updateFilters({ sender: value === ALL ? "" : value, page: 1 })}>
                  <SelectTrigger className="h-10" aria-label="Numéro WhatsApp"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Tous les numéros</SelectItem>
                    {senderOptions.map((sender) => <SelectItem key={sender.key} value={sender.key}>{sender.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : null}
            </div>
          ) : null}

          {hasFilters ? (
            <div className="flex flex-wrap items-center gap-2">
              {filters.status ? (
                <Badge variant="outline">Statut : {messageStatusLabel(filters.status)}</Badge>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setQuery(""); updateFilters({ query: "", channel: "", origin: "", outcome: "", status: "", key: "", application: "", sender: "", period: "30d", page: 1 }); }}
              >
                <X aria-hidden="true" />Effacer les filtres
              </Button>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className={cn("p-0 transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
          <MessageTable messages={messages} onSelect={openMessage} />
          <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Page <span className="font-mono tabular-nums">{filters.page}</span> sur <span className="font-mono tabular-nums">{pageCount}</span></p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => updateFilters({ page: filters.page - 1 })} disabled={isPending || filters.page <= 1}><ChevronLeft aria-hidden="true" />Précédent</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => updateFilters({ page: filters.page + 1 })} disabled={isPending || filters.page >= pageCount}>Suivant<ChevronRight aria-hidden="true" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <MessageDetailSheet
        message={selectedMessage}
        onOpenChange={(open) => {
          if (!open) openMessage(null);
        }}
      />
    </>
  );
}

export type { ApiMessageDetail } from "./message-types";
