"use client";

import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type FeedbackType = "BUG" | "IDEA" | "OTHER";
type FeedbackPriority = "LOW" | "MEDIUM" | "HIGH";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);

  const openFeedback = useCallback(() => {
    setOpening(true);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        setReady(true);
        setOpen(true);
        setOpening(false);
      }, 0);
    });
  }, []);

  useEffect(() => {
    function handleOpen() {
      openFeedback();
    }

    document.addEventListener("open-feedback-widget", handleOpen);
    return () => document.removeEventListener("open-feedback-widget", handleOpen);
  }, [openFeedback]);

  useEffect(() => {
    const scheduleIdle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback
        : (callback: IdleRequestCallback) => window.setTimeout(callback, 250);
    const cancelIdle =
      "cancelIdleCallback" in window
        ? window.cancelIdleCallback
        : (id: number) => window.clearTimeout(id);

    const id = scheduleIdle(() => setReady(true));
    return () => cancelIdle(id);
  }, []);

  return (
    <>
      <Button
        type="button"
        onClick={openFeedback}
        data-opening={opening}
        className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4 z-[80] h-11 rounded-full px-4 shadow-lg"
        aria-label="Donner mon avis"
      >
        <MessageSquarePlus className="size-4" />
        <span>{opening ? "Ouverture..." : "Donner mon avis"}</span>
      </Button>
      {ready ? <FeedbackDialog open={open} onOpenChange={setOpen} /> : null}
    </>
  );
}

function FeedbackDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [type, setType] = useState<FeedbackType>("BUG");
  const [priority, setPriority] = useState<FeedbackPriority>("MEDIUM");
  const [message, setMessage] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [canContactBack, setCanContactBack] = useState(true);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [dialogContent, setDialogContent] = useState<HTMLDivElement | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) return;

    setPending(true);
    setStatus("idle");

    const viewport =
      typeof window === "undefined" ? undefined : `${window.innerWidth}x${window.innerHeight}`;
    const browser = typeof navigator === "undefined" ? undefined : navigator.userAgent;
    const pageTitle = typeof document === "undefined" ? undefined : document.title;

    const payload = {
      type,
      priority,
      message: trimmed,
      canContactBack,
      ...(pathname ? { context: pathname } : {}),
      ...(pageTitle ? { pageTitle } : {}),
      ...(browser ? { browser } : {}),
      ...(viewport ? { viewport } : {}),
      ...(screenshotUrl.trim() ? { screenshotUrl: screenshotUrl.trim() } : {}),
    };

    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setPending(false);
    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("success");
    window.setTimeout(() => onOpenChange(false), 700);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        ref={setDialogContent}
        className="grid max-h-[85vh] w-[calc(100%-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-visible sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageSquarePlus className="size-4" />
            </span>
            Donner mon avis
          </DialogTitle>
          <DialogDescription>
            Signalez un bug, une idée ou un point bloquant. Le contexte de la page est joint automatiquement.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="-mx-1 grid min-h-0 gap-4 overflow-y-auto px-1">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="feedback-type">Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as FeedbackType)}>
                <SelectTrigger id="feedback-type" aria-label="Type de retour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portalContainer={dialogContent}>
                  <SelectItem value="BUG">Bug</SelectItem>
                  <SelectItem value="IDEA">Idée</SelectItem>
                  <SelectItem value="OTHER">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedback-priority">Priorité</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as FeedbackPriority)}>
                <SelectTrigger id="feedback-priority" aria-label="Priorité du retour">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent portalContainer={dialogContent}>
                  <SelectItem value="LOW">Faible</SelectItem>
                  <SelectItem value="MEDIUM">Normale</SelectItem>
                  <SelectItem value="HIGH">Haute</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Décrivez ce qui bloque, ce que vous attendiez ou l'amélioration souhaitée."
              rows={5}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="feedback-screenshot">Capture ou lien, optionnel</Label>
            <Input
              id="feedback-screenshot"
              value={screenshotUrl}
              onChange={(event) => setScreenshotUrl(event.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Vous pouvez me recontacter</p>
              <p className="text-xs text-muted-foreground">
                Activez cette option si une clarification est possible.
              </p>
            </div>
            <Switch checked={canContactBack} onCheckedChange={setCanContactBack} aria-label="Autoriser le recontact" />
          </div>

          <p className="text-xs text-muted-foreground">
            Contexte : <span className="text-foreground">{pathname}</span>
          </p>

          {status === "success" ? (
            <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
              Merci, votre retour a été enregistré.
            </p>
          ) : null}
          {status === "error" ? (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
              Impossible d&apos;enregistrer ce retour pour le moment.
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending || !message.trim()}>
              {pending ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
