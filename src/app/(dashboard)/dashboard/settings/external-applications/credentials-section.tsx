"use client";

import { useState } from "react";
import { KeyRound, Loader2, RotateCcw, ShieldOff } from "lucide-react";

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
import { revokeCommandCredential, rotateCommandCredential } from "./actions";
import { SecretReveal } from "./secret-reveal";
import type { CredentialView, RevealedSecret } from "./types";

function credentialStatus(credential: CredentialView): { label: string; variant: "success" | "destructive" | "warning" } {
  if (credential.revokedAt) return { label: "Révoqué", variant: "destructive" };
  if (credential.expiresAt && new Date(credential.expiresAt) <= new Date()) {
    return { label: "Expiré", variant: "warning" };
  }
  return { label: "Actif", variant: "success" };
}

export function CredentialsSection({
  applicationId,
  credentials,
  canManage,
}: {
  applicationId: string;
  credentials: CredentialView[];
  canManage: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);

  async function rotate() {
    setError("");
    setPending(true);
    const result = await rotateCommandCredential(applicationId);
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("keyId" in result && "secret" in result) {
      setRevealed({
        title: `Credential COMMAND_INGRESS v${result.version}`,
        description: "Les anciennes versions restent actives jusqu'à leur révocation.",
        keyIdLabel: "MAILPULSE_COMMANDS_KEY_ID",
        keyId: result.keyId,
        secretLabel: "MAILPULSE_COMMANDS_SECRET",
        secret: result.secret,
      });
    }
  }

  async function revoke(credentialId: string) {
    setError("");
    setPending(true);
    const result = await revokeCommandCredential(applicationId, credentialId);
    setPending(false);
    if ("error" in result && result.error) setError(result.error);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <KeyRound className="h-4 w-4 text-zinc-400" />
          Credentials de commande
        </h3>
        {canManage ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={pending}>
                <RotateCcw className="h-3.5 w-3.5" />
                Nouvelle version
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Générer une nouvelle version ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Un nouveau couple keyId + secret sera créé. L&apos;ancienne version reste active jusqu&apos;à sa
                  révocation, ce qui permet une bascule sans interruption côté partenaire.
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

      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
        {credentials.length === 0 ? (
          <p className="p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Aucun credential de commande. Générez une première version.
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
              {credentials.map((credential) => {
                const status = credentialStatus(credential);
                return (
                  <TableRow key={credential.id}>
                    <TableCell className="font-mono text-xs">{credential.keyId}</TableCell>
                    <TableCell className="font-mono text-xs">v{credential.version}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(credential.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                    {canManage ? (
                      <TableCell className="text-right">
                        {!credential.revokedAt ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" disabled={pending}>
                                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                                Révoquer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Révoquer {credential.keyId} ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Les requêtes signées avec cette version seront refusées immédiatement. Cette action
                                  est irréversible.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-500"
                                  onClick={() => revoke(credential.id)}
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={revealed !== null} onOpenChange={(next) => !next && setRevealed(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau credential généré</DialogTitle>
          </DialogHeader>
          {revealed ? <SecretReveal secret={revealed} /> : null}
          <DialogFooter>
            <Button onClick={() => setRevealed(null)}>J&apos;ai copié mes clés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
