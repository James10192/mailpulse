"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  cancelApplicationWhatsAppPairing,
  pollApplicationWhatsAppPairing,
  startApplicationWhatsAppPairing,
} from "./whatsapp-pairing-actions";

const POLL_INTERVAL_MS = 3000;

type View =
  | { kind: "starting" }
  | { kind: "waiting"; qr?: string; pairingCode?: string }
  | { kind: "connected"; senderId: string | null }
  | { kind: "error"; message: string };

function qrSource(qr: string) {
  return qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`;
}

export function WhatsAppPairingDialog({
  applicationId,
  replaceAccountId,
  onClose,
}: {
  applicationId: string;
  /** The number whose instance the scan replaces; null adds a new number. */
  replaceAccountId: string | null;
  onClose: () => void;
}) {
  const replacing = replaceAccountId !== null;
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "starting" });
  const instanceRef = useRef<string | null>(null);
  const connectedRef = useRef(false);
  // Bumped by every start and by unmount: a start that resolves late belongs to nobody and is cleaned up.
  const generationRef = useRef(0);

  // Requests a pairing instance; results that arrive after a newer start or after unmount are cleaned up.
  const requestPairing = useCallback(() => {
    const previous = instanceRef.current;
    if (previous && !connectedRef.current) void cancelApplicationWhatsAppPairing(applicationId, previous);
    connectedRef.current = false;
    instanceRef.current = null;
    const generation = ++generationRef.current;
    return startApplicationWhatsAppPairing(applicationId).then((result): View | null => {
      if (generation !== generationRef.current) {
        if (!("error" in result)) void cancelApplicationWhatsAppPairing(applicationId, result.instanceName);
        return null;
      }
      if ("error" in result) return { kind: "error", message: result.error };
      instanceRef.current = result.instanceName;
      return { kind: "waiting" };
    });
  }, [applicationId]);

  // The parent mounts this dialog only while it is open, so mounting means "start".
  useEffect(() => {
    void requestPairing().then((next) => next && setView(next));
    return () => {
      generationRef.current += 1;
      const instanceName = instanceRef.current;
      if (instanceName && !connectedRef.current) void cancelApplicationWhatsAppPairing(applicationId, instanceName);
      instanceRef.current = null;
    };
  }, [requestPairing, applicationId]);

  function restart() {
    setView({ kind: "starting" });
    void requestPairing().then((next) => next && setView(next));
  }

  const waiting = view.kind === "waiting" || view.kind === "starting";

  useEffect(() => {
    if (!waiting) return;
    let stopped = false;
    let timer: number | undefined;

    async function tick() {
      const instanceName = instanceRef.current;
      if (instanceName) {
        const status = await pollApplicationWhatsAppPairing(applicationId, instanceName, replaceAccountId);
        if (stopped) return;
        if ("error" in status) {
          setView({ kind: "error", message: status.error });
          return;
        }
        if (status.state === "open") {
          connectedRef.current = true;
          setView({ kind: "connected", senderId: status.senderId });
          router.refresh();
          return;
        }
        setView({ kind: "waiting", qr: status.qr, pairingCode: status.pairingCode });
      }
      timer = window.setTimeout(tick, POLL_INTERVAL_MS);
    }

    timer = window.setTimeout(tick, instanceRef.current ? 0 : POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [waiting, applicationId, replaceAccountId, router]);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{replacing ? "Remplacer le numéro WhatsApp" : "Ajouter un numéro WhatsApp"}</DialogTitle>
          <DialogDescription>
            Sur le téléphone de l&apos;établissement : WhatsApp › Appareils connectés › Connecter un appareil, puis
            scannez le code.
            {replacing
              ? " L'ancien téléphone sera déconnecté une fois le nouveau relié ; le nom et l'historique du numéro restent."
              : " Le numéro s'ajoute à ceux de l'application."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-64 flex-col items-center justify-center gap-3 py-2">
          {view.kind === "starting" ? (
            <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Préparation du code…
            </p>
          ) : null}

          {view.kind === "waiting" ? (
            view.qr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- data URI, nothing to optimise */}
                <img src={qrSource(view.qr)} alt="Code QR WhatsApp" className="h-64 w-64 rounded-lg bg-white p-2" />
                {view.pairingCode ? (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ou saisissez le code <span className="font-mono text-zinc-900 dark:text-zinc-100">{view.pairingCode}</span>
                  </p>
                ) : null}
                <p className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  En attente du scan. Le code se renouvelle de lui-même.
                </p>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <QrCode className="h-4 w-4" />
                Génération du code…
              </p>
            )
          ) : null}

          {view.kind === "connected" ? (
            <div className="flex flex-col items-center gap-2 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Numéro connecté</p>
              {view.senderId ? <p className="font-mono text-sm text-zinc-500 dark:text-zinc-400">+{view.senderId}</p> : null}
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Les messages de cette application partent désormais de ce numéro.
              </p>
            </div>
          ) : null}

          {view.kind === "error" ? (
            <p className="text-center text-sm text-red-600 dark:text-red-400">{view.message}</p>
          ) : null}
        </div>

        <DialogFooter>
          {view.kind === "error" ? (
            <Button variant="outline" className="h-11" onClick={restart}>
              Recommencer
            </Button>
          ) : null}
          <Button className="h-11" variant={view.kind === "connected" ? "default" : "outline"} onClick={onClose}>
            {view.kind === "connected" ? "Terminer" : "Annuler"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
