"use client";

import { useState } from "react";
import {
  MessageSquare, Send, Loader2, Check, AlertTriangle,
  Smartphone, Info, Users, Tag, Hash, Rocket, Phone,
} from "lucide-react";
import { sendMessage, sendBulkMessages, activateSmsForOrg } from "./actions";
import type { SmsChannel } from "@/lib/twilio";
import { HelpModal, HelpButton, StepList, LinkOut } from "@/components/dashboard/help-modal";

export function MessagingClient({
  contactsWithPhone,
  availableTags,
  smsEnabled,
  phoneNumber,
  whatsappNumber,
  masterConfigured,
}: {
  contactsWithPhone: number;
  availableTags: string[];
  smsEnabled: boolean;
  phoneNumber: string | null;
  whatsappNumber: string | null;
  masterConfigured: boolean;
}) {
  const [channel, setChannel] = useState<SmsChannel>("sms");
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | string>("all");
  const [sending, setSending] = useState(false);
  const [activating, setActivating] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  async function handleActivate() {
    setActivating(true);
    setResult(null);
    const res = await activateSmsForOrg("US");
    setActivating(false);
    setResult(res);
  }

  async function handleSend() {
    setSending(true);
    setResult(null);
    const res = mode === "single"
      ? await sendMessage(channel, phone, body)
      : await sendBulkMessages(channel, body, audience);
    setSending(false);
    setResult(res);
    if (res?.success) { setBody(""); setPhone(""); }
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

      {/* Not activated yet */}
      {!smsEnabled && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
            <MessageSquare className="h-8 w-8 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Activez SMS & WhatsApp
            </h2>
            <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
              Envoyez des SMS et messages WhatsApp a vos contacts en un clic.
              MailPulse configure automatiquement votre compte et vous attribue un numero de telephone.
            </p>
          </div>

          {!masterConfigured && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
              Le service SMS n&apos;est pas encore disponible sur cette instance. Contactez l&apos;administrateur.
            </div>
          )}

          {masterConfigured && (
            <>
              {result?.error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  {result.error}
                </div>
              )}
              <button
                onClick={handleActivate}
                disabled={activating}
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer disabled:opacity-50"
              >
                {activating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Activation en cours...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Activer SMS & WhatsApp
                  </>
                )}
              </button>
              <p className="text-[11px] text-zinc-500">
                Un numero de telephone vous sera automatiquement attribue.
              </p>
            </>
          )}
        </div>
      )}

      {/* Activated — show messaging UI */}
      {smsEnabled && (
        <>
          {/* Phone number info */}
          <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-300/80 space-y-1">
                <p>{contactsWithPhone} contact{contactsWithPhone !== 1 ? "s" : ""} avec un numero de telephone.</p>
                {phoneNumber && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    Numero SMS : <span className="font-mono text-zinc-300">{phoneNumber}</span>
                  </p>
                )}
                {whatsappNumber && (
                  <p className="flex items-center gap-1.5">
                    <Hash className="h-3 w-3" />
                    WhatsApp : <span className="font-mono text-zinc-300">{whatsappNumber}</span>
                  </p>
                )}
              </div>
            </div>
            <HelpButton onClick={() => setHelpOpen(true)} />
          </div>

          <MessagingHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

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
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+225 07 XX XX XX XX"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
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
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Message</h2>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={channel === "sms" ? 1600 : 4096}
              placeholder="Bonjour {{firstName}}, ..."
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
              <p className="text-sm text-emerald-400">Message{mode === "bulk" ? "s" : ""} envoye{mode === "bulk" ? "s" : ""} !</p>
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
              disabled={sending || !body || (mode === "single" && !phone)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer {mode === "bulk" ? "en masse" : ""}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Help Modal ─── */

function MessagingHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <HelpModal
      open={open}
      onClose={onClose}
      title="SMS & WhatsApp"
      subtitle="Comment envoyer des messages"
      sections={[
        {
          title: "Comment ca marche ?",
          defaultOpen: true,
          content: (
            <div className="space-y-2">
              <p>
                MailPulse vous permet d&apos;envoyer des <strong className="text-zinc-200">SMS</strong> et <strong className="text-zinc-200">messages WhatsApp</strong> directement a vos contacts.
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong className="text-zinc-200">SMS</strong> — Messages texte classiques. Ideal pour notifications, rappels et alertes.</li>
                <li><strong className="text-zinc-200">WhatsApp</strong> — Messages enrichis. Parfait pour promotions et communication client.</li>
              </ul>
              <p>
                L&apos;activation est automatique : MailPulse cree un compte d&apos;envoi dedie et vous attribue un numero de telephone.
              </p>
            </div>
          ),
        },
        {
          title: "Ajouter des numeros a vos contacts",
          content: (
            <div className="space-y-3">
              <p>Vos contacts doivent avoir un numero au format international (+XXX).</p>
              <StepList steps={[
                "Allez dans Contacts et editez un contact",
                "Ajoutez le numero au format +225XXXXXXXXX (Cote d'Ivoire) ou +33XXXXXXXXX (France)",
                "Ou importez via CSV avec une colonne 'phone'",
              ]} />
            </div>
          ),
        },
        {
          title: "Envoi en masse",
          content: (
            <div className="space-y-2">
              <p>Selectionnez &laquo; Envoi en masse &raquo; pour envoyer a tous vos contacts ou filtrer par tag.</p>
              <p>Variables disponibles : <code className="text-orange-400">{"{{firstName}}"}</code>, <code className="text-orange-400">{"{{lastName}}"}</code></p>
              <p className="text-amber-400 text-xs">Les SMS sont factures a l&apos;unite (~0.0075$/SMS en Cote d&apos;Ivoire). Le cout est inclus dans votre abonnement Pro.</p>
            </div>
          ),
        },
        {
          title: "FAQ",
          content: (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-zinc-300">Combien coute un SMS ?</p>
                <p className="text-xs mt-1">Le prix varie par pays : ~0.0075$/SMS en CI, ~0.0079$/SMS au Senegal. Inclus dans le plan Pro.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">WhatsApp necessite-t-il une approbation ?</p>
                <p className="text-xs mt-1">Pour envoyer le premier message a un contact, vous devez utiliser un template approuve par WhatsApp. Les reponses sont libres pendant 24h.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Puis-je changer mon numero ?</p>
                <p className="text-xs mt-1">Contactez le support pour changer de numero ou de pays.</p>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
