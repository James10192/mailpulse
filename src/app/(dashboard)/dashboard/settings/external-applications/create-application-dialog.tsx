"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

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
import { createExternalApplication } from "./actions";
import { SecretReveal } from "./secret-reveal";
import type { RevealedSecret } from "./types";

export function CreateApplicationDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);

  function reset() {
    setName("");
    setKey("");
    setError("");
    setRevealed(null);
    setPending(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    const result = await createExternalApplication({ key, name });
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("keyId" in result && "secret" in result) {
      setRevealed({
        title: "Application créée",
        description: "Credential COMMAND_INGRESS v1 généré pour l'authentification des commandes.",
        keyIdLabel: "MAILPULSE_COMMANDS_KEY_ID",
        keyId: result.keyId,
        secretLabel: "MAILPULSE_COMMANDS_SECRET",
        secret: result.secret,
      });
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Nouvelle application
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          {revealed ? (
            <>
              <DialogHeader>
                <DialogTitle>Clés de l&apos;application</DialogTitle>
                <DialogDescription>
                  Transmettez ces valeurs à l&apos;application partenaire de façon sécurisée.
                </DialogDescription>
              </DialogHeader>
              <SecretReveal secret={revealed} />
              <DialogFooter>
                <Button onClick={() => handleOpenChange(false)}>J&apos;ai copié mes clés</Button>
              </DialogFooter>
            </>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>Nouvelle application externe</DialogTitle>
                <DialogDescription>
                  Déclarez une application partenaire (ex. KLASSCI). Un credential de commande sera généré
                  immédiatement.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="application-name">Nom</Label>
                <Input
                  id="application-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="KLASSCI"
                  required
                  minLength={2}
                  maxLength={80}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="application-key">Clé technique</Label>
                <Input
                  id="application-key"
                  value={key}
                  onChange={(event) => setKey(event.target.value.toLowerCase())}
                  placeholder="klassci"
                  required
                  pattern="[a-z0-9][a-z0-9._-]{1,63}"
                  className="font-mono"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Identifie l&apos;application dans l&apos;URL des commandes. Minuscules, chiffres, . _ - uniquement.
                </p>
              </div>
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Créer l&apos;application
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
