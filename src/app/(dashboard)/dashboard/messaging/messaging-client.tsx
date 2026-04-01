"use client";

import { useState } from "react";
import {
  MessageSquare, Send, Loader2, Check, AlertTriangle,
  Smartphone, Info, Users, Tag, Hash,
} from "lucide-react";
import { sendMessage, sendBulkMessages } from "./actions";
import type { SmsChannel } from "@/lib/twilio";
import { HelpModal, HelpButton, StepList, LinkOut } from "@/components/dashboard/help-modal";

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
  const [helpOpen, setHelpOpen] = useState(false);

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
        <div className="flex-1 flex items-start justify-between gap-3">
          <p className="text-sm text-blue-300/80">
            {contactsWithPhone} contact{contactsWithPhone !== 1 ? "s" : ""} avec un numero de telephone.
            Les numeros doivent etre au format international (+225XXXXXXXXX).
          </p>
          <HelpButton onClick={() => setHelpOpen(true)} />
        </div>
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

function MessagingHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <HelpModal
      open={open}
      onClose={onClose}
      title="SMS & WhatsApp"
      subtitle="Comment configurer et envoyer des messages"
      sections={[
        {
          title: "Qu'est-ce que SMS & WhatsApp ?",
          defaultOpen: true,
          content: (
            <div className="space-y-2">
              <p>
                Cette fonctionnalite vous permet d&apos;envoyer des <strong>SMS</strong> et des <strong>messages WhatsApp</strong> directement a vos contacts depuis MailPulse, via l&apos;API Twilio.
              </p>
              <p><strong>Differences entre les deux canaux :</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>SMS</strong> — Messages texte classiques, recus sur tous les telephones. Ideal pour les notifications courtes, rappels et alertes urgentes.</li>
                <li><strong>WhatsApp</strong> — Messages enrichis (images, boutons, liens). Parfait pour les promotions, confirmations de commande et communication client.</li>
              </ul>
              <p><strong>Cas d&apos;utilisation :</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Notifications de livraison ou confirmation de commande</li>
                <li>Rappels de rendez-vous ou d&apos;echeance</li>
                <li>Promotions et offres speciales</li>
                <li>Messages de bienvenue et onboarding</li>
              </ul>
            </div>
          ),
        },
        {
          title: "Etape 1 : Creer un compte Twilio",
          content: (
            <div className="space-y-3">
              <p>Twilio est le service qui envoie vos SMS et messages WhatsApp. Vous avez besoin d&apos;un compte Twilio pour utiliser cette fonctionnalite.</p>
              <StepList
                steps={[
                  "Inscrivez-vous sur twilio.com (essai gratuit disponible)",
                  "Depuis la Console Twilio, recuperez votre Account SID et Auth Token",
                  "Achetez un numero de telephone (~1$/mois) dans Phone Numbers > Manage > Buy a Number",
                  "Pour WhatsApp : configurez un WhatsApp Business Profile dans Messaging > Try it out > Send a WhatsApp message",
                ]}
              />
              <p>
                <LinkOut href="https://www.twilio.com/try-twilio">Creer un compte Twilio</LinkOut>
              </p>
            </div>
          ),
        },
        {
          title: "Etape 2 : Configurer les variables d'environnement",
          content: (
            <div className="space-y-3">
              <p>Ajoutez ces 4 variables dans votre dashboard Vercel (Settings &gt; Environment Variables) ou dans votre fichier <code className="text-zinc-300">.env.local</code> :</p>
              <div className="space-y-2">
                <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 p-3">
                  <code className="text-xs font-mono text-zinc-900 dark:text-zinc-200 block space-y-1">
                    <span className="block">TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</span>
                    <span className="block">TWILIO_AUTH_TOKEN=votre_auth_token</span>
                    <span className="block">TWILIO_PHONE_NUMBER=+1234567890</span>
                    <span className="block">TWILIO_WHATSAPP_NUMBER=+1234567890</span>
                  </code>
                </div>
              </div>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>TWILIO_ACCOUNT_SID</strong> — Identifiant de votre compte (commence par AC)</li>
                <li><strong>TWILIO_AUTH_TOKEN</strong> — Token secret pour authentifier les requetes</li>
                <li><strong>TWILIO_PHONE_NUMBER</strong> — Votre numero Twilio pour les SMS (format +XXXXXXXXXXX)</li>
                <li><strong>TWILIO_WHATSAPP_NUMBER</strong> — Votre numero WhatsApp Business (optionnel, meme format)</li>
              </ul>
            </div>
          ),
        },
        {
          title: "Etape 3 : Ajouter des numeros a vos contacts",
          content: (
            <div className="space-y-3">
              <p>Pour envoyer des messages, vos contacts doivent avoir un numero de telephone au format international (commencant par <code className="text-zinc-300">+</code>).</p>
              <StepList
                steps={[
                  "Allez dans Contacts et editez un contact existant",
                  "Ajoutez le numero de telephone au format international (ex: +22507XXXXXXXX pour la Cote d'Ivoire)",
                  "Vous pouvez aussi importer des numeros en masse via un fichier CSV avec une colonne 'phone'",
                ]}
              />
              <p className="text-amber-400 text-xs">
                Les numeros sans le prefixe international (+) ne seront pas pris en compte.
              </p>
            </div>
          ),
        },
        {
          title: "Envoi en masse",
          content: (
            <div className="space-y-2">
              <p>Vous pouvez envoyer un message a tous vos contacts avec un numero de telephone, ou filtrer par tag.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Filtrage par tag</strong> — Selectionnez un tag pour cibler un segment specifique de vos contacts</li>
                <li><strong>Personnalisation</strong> — Utilisez les variables <code className="text-zinc-300">{"{{firstName}}"}</code> et <code className="text-zinc-300">{"{{lastName}}"}</code> pour personnaliser chaque message</li>
                <li><strong>Limites</strong> — Twilio impose des limites de debit : environ 1 SMS/seconde par numero. Pour de gros volumes, envisagez plusieurs numeros ou un short code</li>
              </ul>
            </div>
          ),
        },
        {
          title: "FAQ",
          content: (
            <div className="space-y-3">
              <div>
                <p className="font-medium text-zinc-200">Combien coute un SMS ?</p>
                <p>En Cote d&apos;Ivoire, un SMS via Twilio coute environ <strong>0,0075 $</strong> (~5 FCFA). Les prix varient selon le pays de destination. Consultez la <LinkOut href="https://www.twilio.com/sms/pricing">grille tarifaire Twilio</LinkOut>.</p>
              </div>
              <div>
                <p className="font-medium text-zinc-200">WhatsApp necessite-t-il des templates ?</p>
                <p>Oui, pour envoyer le <strong>premier message</strong> a un contact sur WhatsApp, vous devez utiliser un template pre-approuve par Meta. Les reponses dans les 24h suivantes sont libres.</p>
              </div>
              <div>
                <p className="font-medium text-zinc-200">Quelle est la difference entre sandbox et production ?</p>
                <p>Le mode sandbox Twilio est gratuit mais limite : seuls les numeros verifies peuvent recevoir des messages. En production, vous pouvez envoyer a n&apos;importe quel numero.</p>
              </div>
              <div>
                <p className="font-medium text-zinc-200">Comment suivre le statut de livraison ?</p>
                <p>Twilio envoie des callbacks de statut (queued, sent, delivered, failed). MailPulse affiche le resultat apres chaque envoi.</p>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
