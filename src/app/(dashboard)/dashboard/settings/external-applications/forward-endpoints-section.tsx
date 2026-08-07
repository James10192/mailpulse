"use client";

import { useState } from "react";
import { Plus, RotateCcw, Webhook } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { rotateForwardSecret, toggleForwardEndpoint } from "./endpoint-actions";
import { ForwardEndpointDialog } from "./forward-endpoint-dialog";
import { SecretReveal } from "./secret-reveal";
import type { ForwardEndpointView, RevealedSecret } from "./types";

export function ForwardEndpointsSection({
  applicationId,
  endpoints,
  canManage,
}: {
  applicationId: string;
  endpoints: ForwardEndpointView[];
  canManage: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingId, setPendingId] = useState("");
  const [error, setError] = useState("");
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);

  async function rotate(endpoint: ForwardEndpointView) {
    setError("");
    setPendingId(endpoint.id);
    const result = await rotateForwardSecret(endpoint.id);
    setPendingId("");
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("keyId" in result && "secret" in result) {
      setRevealed({
        title: "Secret de rappel régénéré",
        description: "L'ancien couple keyId + secret ne signe plus aucune livraison.",
        keyIdLabel: "MAILPULSE_CALLBACK_KEY_ID",
        keyId: result.keyId,
        secretLabel: "MAILPULSE_CALLBACK_SECRET",
        secret: result.secret,
      });
    }
  }

  async function toggle(endpoint: ForwardEndpointView, active: boolean) {
    setError("");
    setPendingId(endpoint.id);
    const result = await toggleForwardEndpoint(endpoint.id, active);
    setPendingId("");
    if ("error" in result && result.error) setError(result.error);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <Webhook className="h-4 w-4 text-zinc-400" />
          Endpoints de rappel
        </h3>
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter
          </Button>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      <div className="mt-3 space-y-3">
        {endpoints.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 p-6 text-center dark:border-zinc-800">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Aucun endpoint de rappel. Ajoutez une URL HTTPS pour recevoir les événements entrants.
            </p>
          </div>
        ) : (
          endpoints.map((endpoint) => (
            <div key={endpoint.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="truncate font-mono text-sm text-zinc-900 dark:text-zinc-100">{endpoint.url}</p>
                  <p className="font-mono text-xs text-zinc-500 dark:text-zinc-400">keyId : {endpoint.keyId}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {endpoint.events.map((event) => (
                      <Badge key={event} variant="outline" className="font-mono">
                        {event}
                      </Badge>
                    ))}
                  </div>
                </div>
                {canManage ? (
                  <div className="flex shrink-0 items-center gap-3">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={pendingId === endpoint.id}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Régénérer le secret
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Régénérer le secret de cet endpoint ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            L&apos;ancien secret cessera immédiatement de signer les livraisons. L&apos;application
                            partenaire devra être mise à jour avec le nouveau couple keyId + secret.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction onClick={() => rotate(endpoint)}>Régénérer</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={endpoint.active}
                        disabled={pendingId === endpoint.id}
                        onCheckedChange={(checked) => toggle(endpoint, checked)}
                        aria-label={endpoint.active ? "Désactiver l'endpoint" : "Activer l'endpoint"}
                      />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {endpoint.active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <Badge variant={endpoint.active ? "success" : "secondary"}>
                    {endpoint.active ? "Actif" : "Inactif"}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ForwardEndpointDialog applicationId={applicationId} open={dialogOpen} onOpenChange={setDialogOpen} />

      <Dialog open={revealed !== null} onOpenChange={(next) => !next && setRevealed(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau secret de rappel</DialogTitle>
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
