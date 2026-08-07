"use client";

import { useState } from "react";
import { Check, Copy, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RevealedSecret } from "./types";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-orange-500/20 bg-white px-3 py-2 font-mono text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
          {value}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0">
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copié" : "Copier"}
        </Button>
      </div>
    </div>
  );
}

/** One-time display of freshly generated key material. Values are never shown again. */
export function SecretReveal({ secret }: { secret: RevealedSecret }) {
  return (
    <div className="space-y-4 rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
      <div className="flex gap-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{secret.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {secret.description} Copiez ces valeurs maintenant : elles ne seront plus jamais affichées.
          </p>
        </div>
      </div>
      <CopyField label={secret.keyIdLabel} value={secret.keyId} />
      <CopyField label={secret.secretLabel} value={secret.secret} />
    </div>
  );
}
