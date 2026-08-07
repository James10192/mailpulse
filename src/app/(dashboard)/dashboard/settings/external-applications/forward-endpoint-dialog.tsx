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
import { Switch } from "@/components/ui/switch";
import { upsertForwardEndpoint } from "./endpoint-actions";
import { SecretReveal } from "./secret-reveal";
import type { RevealedSecret } from "./types";

const KNOWN_EVENTS = [
  { value: "whatsapp.inbound_message", label: "Messages WhatsApp entrants" },
  { value: "whatsapp.message_status", label: "Statuts de livraison WhatsApp" },
] as const;

// Status callbacks carry a different payload shape, so an application opts into
// them explicitly. Enregistrer une URL existante remplace sa liste d'événements.
const DEFAULT_EVENT = "whatsapp.inbound_message";

export function ForwardEndpointDialog({
  applicationId,
  open,
  onOpenChange,
}: {
  applicationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([DEFAULT_EVENT]);
  const [extraEvents, setExtraEvents] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setUrl("");
      setSelectedEvents(KNOWN_EVENTS.map((event) => event.value));
      setExtraEvents("");
      setError("");
      setNotice("");
      setRevealed(null);
      setPending(false);
    }
  }

  function toggleEvent(value: string, checked: boolean) {
    setSelectedEvents((current) => (checked ? [...current, value] : current.filter((event) => event !== value)));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setNotice("");

    const events = [
      ...selectedEvents,
      ...extraEvents.split(",").map((value) => value.trim()).filter(Boolean),
    ];
    if (events.length === 0) {
      setError("Sélectionnez au moins un événement à transmettre.");
      return;
    }

    setPending(true);
    const result = await upsertForwardEndpoint(applicationId, { url, events });
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("updated" in result && result.updated) {
      setNotice("Événements mis à jour. Le secret existant reste inchangé.");
      return;
    }
    if ("keyId" in result && result.keyId && "secret" in result && result.secret) {
      setRevealed({
        title: "Endpoint de rappel enregistré",
        description: "À configurer côté application partenaire pour vérifier les signatures.",
        keyIdLabel: "MAILPULSE_CALLBACK_KEY_ID",
        keyId: result.keyId,
        secretLabel: "MAILPULSE_CALLBACK_SECRET",
        secret: result.secret,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {revealed ? (
          <>
            <DialogHeader>
              <DialogTitle>Secret de l&apos;endpoint</DialogTitle>
            </DialogHeader>
            <SecretReveal secret={revealed} />
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>J&apos;ai copié mes clés</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Endpoint de rappel</DialogTitle>
              <DialogDescription>
                MailPulse transmettra les événements sélectionnés à cette URL HTTPS publique, signés avec un secret
                dédié. Une URL déjà déclarée est mise à jour sans régénérer son secret, et sa liste d&apos;événements est
                remplacée par celle ci-dessous.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor={`endpoint-url-${applicationId}`}>URL de callback</Label>
              <Input
                id={`endpoint-url-${applicationId}`}
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://partenaire.exemple.com/webhooks/mailpulse"
                required
                className="font-mono"
              />
            </div>
            <div className="space-y-3">
              <Label>Événements transmis</Label>
              {KNOWN_EVENTS.map((event) => (
                <div key={event.value} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <div className="min-w-0">
                    <p className="text-sm text-zinc-900 dark:text-zinc-100">{event.label}</p>
                    <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{event.value}</p>
                  </div>
                  <Switch
                    checked={selectedEvents.includes(event.value)}
                    onCheckedChange={(checked) => toggleEvent(event.value, checked)}
                    aria-label={event.label}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor={`endpoint-extra-${applicationId}`} className="text-xs text-zinc-500 dark:text-zinc-400">
                  Autres événements (séparés par des virgules)
                </Label>
                <Input
                  id={`endpoint-extra-${applicationId}`}
                  value={extraEvents}
                  onChange={(event) => setExtraEvents(event.target.value)}
                  placeholder="sms.message_status"
                  className="font-mono"
                />
              </div>
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            {notice ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                {notice ? "Fermer" : "Annuler"}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
