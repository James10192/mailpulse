"use client";

import { useState } from "react";
import { Check, CheckCheck, Copy, Loader2, Send } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

const CONTACT_EMAILS = [
  "djedjelipatrick@gmail.com",
  "yablaiyablairubenvirgil@gmail.com",
];

const MAILTO_HREF = `mailto:${CONTACT_EMAILS.join(",")}?subject=MailPulse%20-%20Contact`;

export function ContactDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !message) return;
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Erreur lors de l'envoi.");
      }
    } catch {
      setError("Erreur réseau. Écrivez-nous directement par e-mail.");
    }
    setSending(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAILS.join(", "));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function handleClose() {
    setSent(false);
    setName("");
    setEmail("");
    setMessage("");
    setError("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <div className="grid justify-items-center gap-4 py-4 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
              <Check className="size-6" />
            </span>
            <DialogHeader className="text-center sm:text-center">
              <DialogTitle>Message envoyé</DialogTitle>
              <DialogDescription>Merci {name}. Nous vous répondrons dans les plus brefs délais.</DialogDescription>
            </DialogHeader>
            <Button type="button" onClick={handleClose}>Fermer</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-4">
            <DialogHeader>
              <DialogTitle>Nous contacter</DialogTitle>
              <DialogDescription>Une question, un besoin ? Nous répondons en français.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="contact-name">Nom</Label>
              <Input id="contact-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" autoComplete="name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-email">E-mail</Label>
              <Input id="contact-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" autoComplete="email" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-message">Message</Label>
              <Textarea id="contact-message" required rows={4} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Décrivez votre besoin…" />
            </div>
            {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
            <DialogFooter className="flex-col gap-3 sm:flex-col">
              <Button type="submit" className="w-full" disabled={sending || !name || !email || !message}>
                {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                {sending ? "Envoi…" : "Envoyer"}
              </Button>
              <div className="flex items-center justify-center gap-1 text-xs">
                <a href={MAILTO_HREF} className="font-mono text-orange-600 underline-offset-4 hover:underline dark:text-orange-400">{CONTACT_EMAILS[0]}</a>
                <Button type="button" variant="ghost" size="icon" className="size-7" onClick={handleCopy} aria-label="Copier les adresses de contact">
                  {copied ? <CheckCheck className="size-3.5 text-emerald-500" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Button that opens the contact dialog; keeps the caller's own styling. */
export function ContactButton({ children, className }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </Button>
      <ContactDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
