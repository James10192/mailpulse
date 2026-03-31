"use client";

import { useState } from "react";
import { X, HelpCircle, ChevronDown, ChevronUp, ExternalLink, Copy, CheckCheck } from "lucide-react";

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
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
              <p className="text-xs text-zinc-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {sections.map((section, i) => (
            <AccordionSection key={i} title={section.title} defaultOpen={section.defaultOpen ?? i === 0}>
              {section.content}
            </AccordionSection>
          ))}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            J&apos;ai compris
          </button>
        </div>
      </div>
    </div>
  );
}

function AccordionSection({ title, defaultOpen, children }: { title: string; defaultOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
      >
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 text-sm text-zinc-600 dark:text-zinc-400 space-y-3 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
    >
      <HelpCircle className="h-3.5 w-3.5" />
      Comment configurer ?
    </button>
  );
}

export function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-3">
      {label && <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1">{label}</p>}
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-zinc-900 dark:text-zinc-200 break-all">{value}</code>
        <button
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="shrink-0 p-1 rounded text-zinc-400 hover:text-zinc-200 cursor-pointer"
        >
          {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
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
