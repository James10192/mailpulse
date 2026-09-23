"use client";

import { useState } from "react";
import {
  AlertOctagon, AlertTriangle, CheckCircle, Eye, Filter, Mail, MousePointerClick,
  Search, Send, Tag, UserMinus, UserPlus, Zap,
} from "lucide-react";
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

export interface TimelineEvent {
  id: string;
  type: string;
  metadata: unknown;
  createdAt: string;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EVENT_CONFIG: Record<string, { icon: typeof Send; label: string; color: string }> = {
  SUBSCRIBED: { icon: UserPlus, label: "Abonné", color: "text-emerald-500" },
  SENT: { icon: Send, label: "Email envoyé", color: "text-blue-400" },
  DELIVERED: { icon: CheckCircle, label: "Email délivré", color: "text-emerald-400" },
  OPENED: { icon: Eye, label: "Email ouvert", color: "text-sky-400" },
  CLICKED: { icon: MousePointerClick, label: "Email cliqué", color: "text-orange-400" },
  BOUNCED_SOFT: { icon: AlertTriangle, label: "Bounce soft", color: "text-amber-400" },
  BOUNCED_HARD: { icon: AlertTriangle, label: "Bounce hard", color: "text-red-400" },
  COMPLAINED: { icon: AlertOctagon, label: "Spam", color: "text-red-500" },
  FAILED: { icon: AlertTriangle, label: "Échec d'envoi", color: "text-red-400" },
  SUPPRESSED: { icon: AlertOctagon, label: "Adresse en liste de suppression", color: "text-amber-500" },
  UNSUBSCRIBED: { icon: UserMinus, label: "Désabonné", color: "text-zinc-400" },
  TAG_ADDED: { icon: Tag, label: "Tag ajouté", color: "text-purple-400" },
  TAG_REMOVED: { icon: Tag, label: "Tag retiré", color: "text-zinc-400" },
  WORKFLOW_STARTED: { icon: Zap, label: "Automation démarrée", color: "text-orange-500" },
  WORKFLOW_COMPLETED: { icon: CheckCircle, label: "Automation terminée", color: "text-emerald-500" },
};

const EVENT_FILTER_OPTIONS = Object.entries(EVENT_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}));

/** Contact activity: email events plus the subscription date, filterable by type and searchable. */
export function ContactActivityTimeline({ events, subscribedAt }: { events: TimelineEvent[]; subscribedAt: string }) {
  const [eventFilter, setEventFilter] = useState<string>("ALL");
  const [eventSearch, setEventSearch] = useState("");

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Activité
        </h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={eventSearch}
              onChange={(e) => setEventSearch(e.target.value)}
              placeholder="Rechercher..."
              aria-label="Rechercher dans l'activité"
              className="h-11 w-36 pl-8 pr-3 text-xs sm:h-9"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 font-normal">
                <Filter />
                {eventFilter === "ALL" ? "Tous les types" : EVENT_CONFIG[eventFilter]?.label ?? eventFilter}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-64 w-56 overflow-y-auto">
              <DropdownMenuRadioGroup value={eventFilter} onValueChange={setEventFilter}>
                <DropdownMenuRadioItem value="ALL" className="text-xs">
                  Tous les types
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                {EVENT_FILTER_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(() => {
        // Build timeline: real events + "Subscribed" pseudo-event from createdAt
        const allEvents = [
          ...events,
          { id: "subscribed-event", type: "SUBSCRIBED", metadata: null, createdAt: subscribedAt },
        ]
          .filter((e) => eventFilter === "ALL" || e.type === eventFilter)
          .filter((e) => {
            if (!eventSearch) return true;
            const cfg = EVENT_CONFIG[e.type];
            return cfg?.label.toLowerCase().includes(eventSearch.toLowerCase());
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return allEvents.length > 0 ? (
          <div className="space-y-1">
            {allEvents.map((event) => {
              const config = EVENT_CONFIG[event.type] ?? {
                icon: Mail,
                label: event.type,
                color: "text-zinc-400",
              };
              const Icon = config.icon;
              const meta = event.metadata as Record<string, string> | null;
              const campaignName = meta?.campaignName ?? null;

              return (
                <div
                  key={event.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <div className={`shrink-0 ${config.color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-900 dark:text-zinc-100">
                      {config.label}
                    </span>
                    {campaignName && (
                      <span className="text-sm text-zinc-500"> · {campaignName}</span>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500 shrink-0">
                    {formatDateTime(event.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-20 text-sm text-zinc-500">
            Aucun événement {eventFilter !== "ALL" ? "de ce type" : ""}
          </div>
        );
      })()}
    </div>
  );
}
