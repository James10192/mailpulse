"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shows a freshly created secret, once. Closing requires an explicit click: a
 * stray click outside would otherwise lose a key nobody can display again.
 */
export function NewKeySecretDialog({
  secret,
  keyName,
  onClose,
}: {
  secret: string | null;
  keyName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Clé copiée dans le presse-papiers.");
    } catch {
      toast.error("La copie a échoué. Sélectionnez la clé et copiez-la à la main.");
    }
  }

  return (
    <Dialog open={secret !== null} onOpenChange={(open) => { if (!open) { setCopied(false); onClose(); } }}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Clé « {keyName} » créée</DialogTitle>
          <DialogDescription>Copiez-la maintenant et gardez-la en lieu sûr.</DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-300">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>MailPulse ne pourra plus l&apos;afficher. Si vous la perdez, créez-en une nouvelle et révoquez celle-ci.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <code className="min-w-0 flex-1 select-all break-all rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs">
            {secret}
          </code>
          <Button type="button" variant="outline" onClick={copy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copiée" : "Copier"}
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => { setCopied(false); onClose(); }}>
            {copied ? "J'ai copié la clé" : "Fermer sans copier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
