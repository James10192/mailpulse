"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setBaileysProviderAccount } from "./baileys-actions";
import { TransportExplainer } from "./transport-explainer";
import type { ProviderAccountView } from "./types";

export function BaileysAccountDialog({
  applicationId,
  account,
  open,
  onOpenChange,
  onSaved,
}: {
  applicationId: string;
  account: ProviderAccountView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [instanceName, setInstanceName] = useState(account?.externalAccountId ?? "");
  const [senderId, setSenderId] = useState("");

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setError("");
      setSenderId("");
      setInstanceName(account?.externalAccountId ?? "");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    const result = await setBaileysProviderAccount(applicationId, { instanceName, senderId });
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    onSaved();
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{account ? "Modifier l'instance Baileys" : "Relier une instance Baileys"}</DialogTitle>
            <DialogDescription>
              L&apos;URL et la clé d&apos;Evolution API sont globales à MailPulse : aucun secret propre à cette
              application n&apos;est stocké ici.
            </DialogDescription>
          </DialogHeader>
          <TransportExplainer transport="BAILEYS" />
          <div className="space-y-2">
            <Label htmlFor={`instance-${applicationId}`}>Nom de l&apos;instance Evolution</Label>
            <Input
              id={`instance-${applicationId}`}
              value={instanceName}
              onChange={(event) => setInstanceName(event.target.value)}
              placeholder="klassci-parents"
              required
              pattern="[a-zA-Z0-9][a-zA-Z0-9._\-]{1,63}"
              className="h-11 font-mono"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Exactement le nom de l&apos;instance créée dans Evolution API. C&apos;est lui qui relie les messages
              entrants à cette application.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`sender-${applicationId}`}>Numéro connecté (optionnel)</Label>
            <Input
              id={`sender-${applicationId}`}
              value={senderId}
              onChange={(event) => setSenderId(event.target.value)}
              placeholder={account?.maskedSenderId ?? "225XXXXXXXXXX"}
              pattern="\d{6,20}"
              inputMode="numeric"
              className="h-11 font-mono"
            />
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Format international sans le +. Purement informatif : Evolution adresse la session par son nom
              d&apos;instance.
            </p>
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
