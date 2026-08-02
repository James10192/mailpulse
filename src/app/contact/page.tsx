"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, Loader2, Check, ArrowLeft, Copy, CheckCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const CONTACT_EMAILS = [
  "djedjelipatrick@gmail.com",
  "yablaiyablairubenvirgil@gmail.com",
];

const MAILTO_HREF = `mailto:${CONTACT_EMAILS.join(",")}?subject=MailPulse%20-%20Contact`;

export default function ContactPage() {
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
        const data = await res.json();
        setError(data.error || "Erreur lors de l'envoi.");
      }
    } catch {
      setError("Erreur reseau. Essayez par email directement.");
    }
    setSending(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(CONTACT_EMAILS.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 dark:bg-zinc-950">
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
            <Check className="h-8 w-8 text-emerald-500" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Message envoyé !</h1>
          <p className="mb-8 text-zinc-500 dark:text-zinc-400">
            Merci {name}. Nous vous repondrons dans les plus brefs delais.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-lg space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
          <BrandMark className="mb-4 text-xl" />
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Contactez-nous</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Une question, une demande Enterprise, ou juste envie de discuter ?
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-[var(--shadow-border)] dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nom *
            </label>
            <input
              id="contact-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Marcel DJEDJE-LI"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email *
            </label>
            <input
              id="contact-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>
          <div>
            <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Message *
            </label>
            <textarea
              id="contact-message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Decrivez votre besoin..."
              className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={sending || !name || !email || !message}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Envoyer le message
              </>
            )}
          </button>
        </form>

        {/* Alternative: email direct */}
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500">Ou contactez-nous directement par email</p>
          <div className="flex items-center justify-center gap-2">
            <a
              href={MAILTO_HREF}
              className="text-sm text-orange-500 hover:text-orange-400 font-mono transition-colors"
            >
              {CONTACT_EMAILS[0]}
            </a>
            <button
              onClick={handleCopy}
              className="cursor-pointer rounded p-1 text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Copier les emails"
            >
              {copied ? <CheckCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
