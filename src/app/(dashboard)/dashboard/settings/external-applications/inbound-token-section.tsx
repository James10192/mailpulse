"use client";

import { useState } from "react";
import { Loader2, RotateCcw, ShieldOff, Webhook } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { revokeInboundToken, rotateInboundToken } from "./baileys-actions";
import { SecretReveal } from "./secret-reveal";
import type { CredentialView, RevealedSecret } from "./types";

function isActive(token: CredentialView) {
  return !token.revokedAt && (!token.expiresAt || new Date(token.expiresAt) > new Date());
}

/** Evolution has no signing secret, so this URL plus its token is the whole auth. */
function webhookBaseUrl(applicationId: string) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  const origin = (configured && configured.trim() !== "" ? configured : globalThis.location?.origin) ?? "";
  return `${origin.replace(/\/+$/, "")}/api/webhooks/whatsapp/baileys/${applicationId}`;
}

export function InboundTokenSection({
  applicationId,
  tokens,
  canManage,
}: {
  applicationId: string;
  tokens: CredentialView[];
  canManage: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);

  const activeCount = tokens.filter(isActive).length;

  async function rotate() {
    setError("");
    setPending(true);
    const result = await rotateInboundToken(applicationId);
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("keyId" in result && "secret" in result) {
      setRevealed({
        title: `Jeton entrant Baileys v${result.version}`,
        description:
          "Collez l'URL complète dans le champ Webhook de votre instance Evolution. Les jetons précédents restent valides jusqu'à leur révocation, ce qui permet une bascule sans coupure.",
        keyIdLabel: "URL de webhook à coller dans Evolution",
        keyId: `${webhookBaseUrl(applicationId)}?token=${result.secret}`,
        secretLabel: "Jeton seul",
        secret: result.secret,
      });
    }
  }

  async function revoke(credentialId: string) {
    setError("");
    setPending(true);
    const result = await revokeInboundToken(applicationId, credentialId);
    setPending(false);
    if ("error" in result && result.error) setError(result.error);
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <Webhook className="h-4 w-4 text-zinc-400" />
          Webhook entrant Evolution
        </h3>
        {canManage ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="h-11 w-full sm:w-auto" disabled={pending}>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                {activeCount === 0 ? "Générer un jeton" : "Régénérer le jeton"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Générer un nouveau jeton entrant ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Une nouvelle URL de webhook sera affichée une seule fois. Les jetons existants restent acceptés
                  jusqu&apos;à leur révocation : mettez d&apos;abord Evolution à jour, puis révoquez l&apos;ancien.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={rotate}>Générer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        Evolution API ne signe pas ses webhooks. L&apos;authentification repose uniquement sur ce jeton, transmis en
        paramètre <code className="font-mono">token</code> de l&apos;URL. Traitez-le comme un mot de passe.
      </p>

      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="mt-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">URL de base</p>
        <code className="mt-1 block overflow-x-auto rounded-md bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
          {webhookBaseUrl(applicationId)}?token=&lt;jeton&gt;
        </code>
      </div>

      <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {tokens.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Aucun jeton entrant. Générez-en un pour que MailPulse accepte les messages de cette instance.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key ID</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                {canManage ? <TableHead className="text-right">Action</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.id}>
                  <TableCell className="font-mono text-xs">{token.keyId}</TableCell>
                  <TableCell className="font-mono text-xs">v{token.version}</TableCell>
                  <TableCell>
                    <Badge variant={isActive(token) ? "success" : "destructive"}>
                      {isActive(token) ? "Actif" : "Révoqué"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
                    {new Date(token.createdAt).toLocaleDateString("fr-FR")}
                  </TableCell>
                  {canManage ? (
                    <TableCell className="text-right">
                      {isActive(token) ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={pending}>
                              <ShieldOff className="h-3.5 w-3.5" />
                              Révoquer
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Révoquer {token.keyId} ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Les webhooks Evolution utilisant ce jeton seront refusés immédiatement. Vérifiez
                                qu&apos;Evolution pointe déjà sur la nouvelle URL. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-500"
                                onClick={() => revoke(token.id)}
                              >
                                Révoquer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={revealed !== null} onOpenChange={(next) => !next && setRevealed(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>URL de webhook Evolution</DialogTitle>
          </DialogHeader>
          {revealed ? <SecretReveal secret={revealed} /> : null}
          <DialogFooter>
            <Button className="h-11" onClick={() => setRevealed(null)}>
              J&apos;ai copié l&apos;URL
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
