"use client";

import { useState } from "react";
import { Bug, Sparkles, Zap } from "lucide-react";

import { changelog, APP_VERSION, type ChangelogEntry } from "@/lib/changelog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STORAGE_KEY = "mailpulse-last-seen-version";

const typeConfig = {
  feature: { icon: Sparkles, label: "Nouveau", variant: "success" },
  fix: { icon: Bug, label: "Correction", variant: "warning" },
  improvement: { icon: Zap, label: "Amélioré", variant: "secondary" },
} as const satisfies Record<string, { icon: typeof Sparkles; label: string; variant: BadgeProps["variant"] }>;

function VersionBlock({ entry }: { entry: ChangelogEntry }) {
  return (
    <AccordionItem value={entry.version} className="overflow-hidden rounded-lg border border-zinc-200 last:border-b dark:border-zinc-800">
      <AccordionTrigger className="min-h-11 items-center gap-3 rounded-none px-3 py-2 font-normal hover:bg-zinc-50 hover:no-underline focus-visible:ring-inset dark:hover:bg-zinc-900">
        <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-3">
            <span className="rounded-md bg-orange-500/10 px-2 py-1 font-mono text-[11px] font-semibold text-orange-600 dark:text-orange-400">
              v{entry.version}
            </span>
            <span className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{entry.title}</span>
          </span>
          <span className="shrink-0 text-[11px] text-zinc-500">{entry.date}</span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-2 px-3 pb-3">
        {entry.changes.map((change) => {
          const config = typeConfig[change.type];
          const Icon = config.icon;

          return (
            <div key={`${entry.version}-${change.text}`} className="flex items-start gap-2">
              <Badge variant={config.variant} className="mt-0.5 shrink-0 rounded-md px-1.5 text-[10px]">
                <Icon className="size-3" />
                {config.label}
              </Badge>
              <span className="text-pretty text-xs leading-5 text-zinc-600 dark:text-zinc-400">{change.text}</span>
            </div>
          );
        })}
      </AccordionContent>
    </AccordionItem>
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
        className="transition-[scale,color,background-color] hover:bg-orange-50 hover:text-orange-600 active:scale-[0.96] dark:hover:bg-orange-500/10 dark:hover:text-orange-400"
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
        <Accordion
          type="multiple"
          defaultValue={changelog[0] ? [changelog[0].version] : []}
          className="min-h-0 space-y-3 overflow-y-auto p-5"
        >
          {changelog.map((entry) => (
            <VersionBlock key={entry.version} entry={entry} />
          ))}
        </Accordion>
        <DialogFooter className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <Button type="button" className="w-full sm:w-auto" onClick={() => handleOpenChange(false)}>
            C&apos;est noté
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
