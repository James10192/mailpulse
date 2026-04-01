"use client";

import { useState } from "react";
import {
  MessageSquare, Send, Loader2, Check, AlertTriangle,
  Smartphone, Info, Users, Tag, Hash,
} from "lucide-react";
import { sendMessage, sendBulkMessages } from "./actions";
import type { SmsChannel } from "@/lib/twilio";

export function MessagingClient({
  contactsWithPhone,
  availableTags,
  configured,
}: {
  contactsWithPhone: number;
  availableTags: string[];
  configured: boolean;
}) {
  const [channel, setChannel] = useState<SmsChannel>("sms");
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | string>("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  async function handleSend() {
    setSending(true);
    setResult(null);

    let res;
    if (mode === "single") {
      res = await sendMessage(channel, phone, body);
    } else {
      res = await sendBulkMessages(channel, body, audience);
    }

    setSending(false);
    setResult(res);
    if (res?.success) {
      setBody("");
      setPhone("");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          SMS & WhatsApp
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Envoyez des messages SMS ou WhatsApp a vos contacts
        </p>
      </div>

      {!configured && (
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-amber-400 font-medium">Twilio non configure</p>
              <p className="text-xs text-zinc-400 mt-1">
                Ajoutez les variables d&apos;environnement <code className="text-zinc-300">TWILIO_ACCOUNT_SID</code>, <code className="text-zinc-300">TWILIO_AUTH_TOKEN</code>, <code className="text-zinc-300">TWILIO_PHONE_NUMBER</code> et optionnellement <code className="text-zinc-300">TWILIO_WHATSAPP_NUMBER</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-sm text-blue-300/80">
          {contactsWithPhone} contact{contactsWithPhone !== 1 ? "s" : ""} avec un numero de telephone.
          Les numeros doivent etre au format international (+225XXXXXXXXX).
        </p>
      </div>

      {/* Channel selector */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Canal
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setChannel("sms")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
              channel === "sms"
                ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            SMS
          </button>
          <button
            onClick={() => setChannel("whatsapp")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
              channel === "whatsapp"
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            <Hash className="h-4 w-4" />
            WhatsApp
          </button>
        </div>
      </div>

      {/* Mode selector */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Users className="h-4 w-4" />
          Destinataire
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("single")}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
              mode === "single"
                ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            Un seul contact
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
              mode === "bulk"
                ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            Envoi en masse ({contactsWithPhone})
          </button>
        </div>

        {mode === "single" && (
          <div className="pt-1">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 07 XX XX XX XX"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>
        )}

        {mode === "bulk" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => setAudience("all")}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                audience === "all"
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400"
              }`}
            >
              Tous ({contactsWithPhone})
            </button>
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setAudience(tag)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer flex items-center gap-1 ${
                  audience === tag
                    ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400"
                }`}
              >
                <Tag className="h-3 w-3" />
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">
          Message
        </h2>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          maxLength={channel === "sms" ? 1600 : 4096}
          placeholder={`Bonjour {{firstName}}, ...`}
          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
        />
        <div className="flex justify-between text-[11px] text-zinc-500">
          <span>Variables : {"{{firstName}}"}, {"{{lastName}}"}</span>
          <span>{body.length} / {channel === "sms" ? 1600 : 4096}</span>
        </div>
      </div>

      {/* Result */}
      {result?.success && (
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
          <Check className="h-5 w-5 text-emerald-500" />
          <p className="text-sm text-emerald-400">Message{mode === "bulk" ? "s" : ""} envoye{mode === "bulk" ? "s" : ""} avec succes !</p>
        </div>
      )}
      {result?.error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
          {result.error}
        </div>
      )}

      {/* Send button */}
      <div className="flex justify-end">
        <button
          onClick={handleSend}
          disabled={sending || !body || (mode === "single" && !phone) || !configured}
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Envoi en cours...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Envoyer {mode === "bulk" ? "en masse" : ""}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
