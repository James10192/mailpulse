"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Users, AtSign, AlertTriangle, Check, Loader2, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { sendCampaign } from "../../actions";

interface CampaignData {
  id: string;
  name: string;
  subject: string | null;
  previewText: string | null;
  htmlContent: string | null;
  status: string;
}

interface SenderData {
  id: string;
  name: string;
  email: string;
  replyTo: string | null;
}

interface ContactListData {
  id: string;
  name: string;
  contactCount: number;
}

export function SendCampaignClient({
  campaign,
  senders,
  contactLists,
  subscribedCount,
}: {
  campaign: CampaignData;
  senders: SenderData[];
  contactLists: ContactListData[];
  subscribedCount: number;
}) {
  const router = useRouter();
  const [senderId, setSenderId] = useState(senders[0]?.id ?? "");
  const [audience, setAudience] = useState<"all" | string>("all");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const selectedSender = senders.find((s) => s.id === senderId);
  const recipientCount = audience === "all"
    ? subscribedCount
    : contactLists.find((l) => l.id === audience)?.contactCount ?? 0;

  const canSend =
    campaign.status === "DRAFT" &&
    senders.length > 0 &&
    senderId &&
    campaign.subject &&
    campaign.htmlContent &&
    recipientCount > 0;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError("");

    const result = await sendCampaign(campaign.id, senderId, audience);

    setSending(false);
    if (result?.success) {
      setSent(true);
    } else if (result?.error) {
      setError(result.error);
    }
  }

  if (sent) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-semibold text-zinc-100 mb-2">
          Campagne envoyee !
        </h1>
        <p className="text-zinc-500 mb-8">
          &laquo; {campaign.name} &raquo; a ete envoyee a {recipientCount} abonne{recipientCount > 1 ? "s" : ""}.
          Les resultats apparaitront dans les analytics.
        </p>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Retour aux campagnes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Envoyer la campagne
        </h1>
        <Link
          href="/dashboard/campaigns"
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Link>
      </div>

      {/* Campaign summary */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Campagne</h2>
        <div>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{campaign.name}</p>
          <p className="text-sm text-zinc-500 mt-1">
            Sujet : <span className="text-zinc-300">{campaign.subject || "—"}</span>
          </p>
          {campaign.previewText && (
            <p className="text-sm text-zinc-500 mt-0.5">
              Apercu : <span className="text-zinc-400">{campaign.previewText}</span>
            </p>
          )}
        </div>
        {!campaign.subject && (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            Le sujet est requis pour envoyer.
          </div>
        )}
        {!campaign.htmlContent && (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            Le contenu est requis pour envoyer.
          </div>
        )}
      </div>

      {/* Sender selection */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <AtSign className="h-4 w-4" />
          Expediteur
        </h2>
        {senders.length > 0 ? (
          <>
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 cursor-pointer"
            >
              {senders.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} &lt;{s.email}&gt;
                </option>
              ))}
            </select>
            {selectedSender?.replyTo && (
              <p className="text-xs text-zinc-500">
                Reponses a : {selectedSender.replyTo}
              </p>
            )}
          </>
        ) : (
          <div className="p-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 text-center">
            <p className="text-sm text-amber-400 mb-2">
              Aucun expediteur configure.
            </p>
            <Link
              href="/dashboard/senders"
              className="text-sm text-orange-500 hover:text-orange-400 font-medium"
            >
              Configurer un expediteur →
            </Link>
          </div>
        )}
      </div>

      {/* Audience selection */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Users className="h-4 w-4" />
          Audience
        </h2>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 cursor-pointer"
        >
          <option value="all">
            Tous les abonnes ({subscribedCount})
          </option>
          {contactLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name} ({list.contactCount} contacts)
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          {recipientCount} destinataire{recipientCount > 1 ? "s" : ""} recevront cet email.
        </p>
        {recipientCount === 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            Aucun abonne dans cette audience.
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Send button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-zinc-500">
          {recipientCount > 0 && senders.length > 0
            ? `Pret a envoyer a ${recipientCount} contact${recipientCount > 1 ? "s" : ""}`
            : "Completez les etapes ci-dessus pour envoyer"}
        </p>
        <button
          onClick={handleSend}
          disabled={!canSend || sending}
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
              Confirmer et envoyer
            </>
          )}
        </button>
      </div>
    </div>
  );
}
