"use client";

import { useState } from "react";
import { CheckCheck, Copy, ExternalLink, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface HelpSection {
  title: string;
  content: React.ReactNode;
  defaultOpen?: boolean;
}

export function HelpModal({
  open,
  onClose,
  title,
  subtitle,
  sections,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  sections: HelpSection[];
}) {
  const initiallyOpen = sections
    .map((section, index) => ((section.defaultOpen ?? index === 0) ? `section-${index}` : null))
    .filter((value): value is string => value !== null);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="flex-row items-center gap-3 border-b p-5 text-left">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400" aria-hidden="true">
            <HelpCircle className="size-5" />
          </span>
          <div className="grid gap-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription className="text-xs">{subtitle}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <Accordion type="multiple" defaultValue={initiallyOpen}>
            {sections.map((section, index) => (
              <AccordionItem key={section.title} value={`section-${index}`}>
                <AccordionTrigger>{section.title}</AccordionTrigger>
                <AccordionContent className="space-y-3 leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {section.content}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <DialogFooter className="border-t p-4">
          <Button type="button" className="w-full" onClick={onClose}>J&apos;ai compris</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      <HelpCircle aria-hidden="true" />
      Comment configurer ?
    </Button>
  );
}

export function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      {label ? <p className="mb-1 text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p> : null}
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all font-mono text-xs text-foreground">{value}</code>
        <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={copy} aria-label={`Copier ${label || "la valeur"}`}>
          {copied ? <CheckCheck className="size-3.5 text-emerald-500" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

export function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-orange-500/10 text-orange-500 text-xs font-bold flex items-center justify-center">
            {i + 1}
          </span>
          <span className="pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

export function LinkOut({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-orange-500 hover:text-orange-400 underline underline-offset-2">
      {children}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
