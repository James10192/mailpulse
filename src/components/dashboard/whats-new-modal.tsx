"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Bug, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { changelog, APP_VERSION, type ChangelogEntry } from "@/lib/changelog";

const STORAGE_KEY = "mailpulse-last-seen-version";

const typeConfig = {
  feature: { icon: Sparkles, label: "Nouveau", className: "text-emerald-400 bg-emerald-500/10" },
  fix: { icon: Bug, label: "Correction", className: "text-amber-400 bg-amber-500/10" },
  improvement: { icon: Zap, label: "Ameliore", className: "text-blue-400 bg-blue-500/10" },
};

function VersionBlock({ entry, defaultOpen }: { entry: ChangelogEntry; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded">
            v{entry.version}
          </span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{entry.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">{entry.date}</span>
          {open ? <ChevronUp className="h-3.5 w-3.5 text-zinc-400" /> : <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />}
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {entry.changes.map((change, i) => {
            const config = typeConfig[change.type];
            const Icon = config.icon;
            return (
              <div key={i} className="flex items-start gap-2">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 mt-0.5 ${config.className}`}>
                  <Icon className="h-2.5 w-2.5" />
                  {config.label}
                </span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">{change.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function WhatsNewModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const lastSeen = localStorage.getItem(STORAGE_KEY);
    if (lastSeen !== APP_VERSION) {
      // Show modal for new version (delay slightly so dashboard renders first)
      const timer = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function handleClose() {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Quoi de neuf ?
              </h2>
              <p className="text-xs text-zinc-500">v{APP_VERSION}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {changelog.map((entry, i) => (
            <VersionBlock key={entry.version} entry={entry} defaultOpen={i === 0} />
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            onClick={handleClose}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            C&apos;est note !
          </button>
        </div>
      </div>
    </div>
  );
}

/** Button to manually open the What's New modal */
export function WhatsNewButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors cursor-pointer"
        title="Quoi de neuf ?"
      >
        <Sparkles className="h-4 w-4" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quoi de neuf ?</h2>
                  <p className="text-xs text-zinc-500">Historique des mises a jour</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {changelog.map((entry, i) => (
                <VersionBlock key={entry.version} entry={entry} defaultOpen={i === 0} />
              ))}
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
              <button onClick={() => setOpen(false)} className="w-full py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
