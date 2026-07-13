"use client";

import { useState } from "react";
import { Bug, ChevronDown, ChevronUp, Sparkles, Zap } from "lucide-react";

import { changelog, APP_VERSION, type ChangelogEntry } from "@/lib/changelog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "mailpulse-last-seen-version";

const typeConfig = {
  feature: { icon: Sparkles, label: "Nouveau", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  fix: { icon: Bug, label: "Correction", className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  improvement: { icon: Zap, label: "Amélioré", className: "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300" },
};

function VersionBlock({ entry, defaultOpen }: { entry: ChangelogEntry; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left transition-[color,background-color] hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="rounded-md bg-orange-500/10 px-2 py-1 font-mono text-[11px] font-semibold text-orange-600 dark:text-orange-400">
            v{entry.version}
          </span>
          <span className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{entry.title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2 text-[11px] text-zinc-500">
          {entry.date}
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>
      {open ? (
        <div className="space-y-2 px-3 pb-3">
          {entry.changes.map((change) => {
            const config = typeConfig[change.type];
            const Icon = config.icon;

            return (
              <div key={`${entry.version}-${change.text}`} className="flex items-start gap-2">
                <span
                  className={cn(
                    "mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                    config.className,
                  )}
                >
                  <Icon className="size-3" />
                  {config.label}
                </span>
                <span className="text-pretty text-xs leading-5 text-zinc-600 dark:text-zinc-400">{change.text}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export function WhatsNewModal() {
  return null;
}

export function WhatsNewButton() {
  const [open, setOpen] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="size-10 transition-[scale,color,background-color] hover:bg-orange-50 hover:text-orange-600 active:scale-[0.96] dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
        aria-label="Quoi de neuf ?"
        title="Quoi de neuf ?"
      >
        <Sparkles className="size-4" />
      </Button>
      <DialogContent className="grid max-h-[82vh] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b border-zinc-200 p-5 pr-12 dark:border-zinc-800">
          <DialogTitle className="flex items-center gap-3 text-balance">
            <span className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Sparkles className="size-5" />
            </span>
            Quoi de neuf ?
          </DialogTitle>
          <DialogDescription>Historique des mises à jour · v{APP_VERSION}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto p-5">
          {changelog.map((entry, index) => (
            <VersionBlock key={entry.version} entry={entry} defaultOpen={index === 0} />
          ))}
        </div>
        <DialogFooter className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <Button type="button" className="w-full sm:w-auto" onClick={() => handleOpenChange(false)}>
            C&apos;est noté
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
