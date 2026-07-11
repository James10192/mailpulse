"use client";

import { useState } from "react";
import { Send, Users, AtSign, AlertTriangle, Check, Loader2, ArrowLeft, Clock, CalendarDays, Tag, MessageCircle } from "lucide-react";
import Link from "next/link";
import { sendCampaign, scheduleCampaign } from "../../actions";

interface CampaignData {
  id: string;
  name: string;
  subject: string | null;
  previewText: string | null;
  htmlContent: string | null;
  channel: "EMAIL" | "WHATSAPP" | "SMS";
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

type AudienceMode = "all" | "segment" | "tag";

export function SendCampaignClient({
  campaign,
  senders,
  subscribedCount,
  availableTags,
  availableSegments,
}: {
  campaign: CampaignData;
  senders: SenderData[];
  subscribedCount: number;
  availableTags: string[];
  availableSegments: ContactListData[];
}) {
  const [senderId, setSenderId] = useState(senders[0]?.id ?? "");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [selectedSegment, setSelectedSegment] = useState(availableSegments[0]?.id ?? "");
  const [selectedTag, setSelectedTag] = useState(availableTags[0] ?? "");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sendMode, setSendMode] = useState<"now" | "schedule">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");

  const selectedSender = senders.find((s) => s.id === senderId);
  const isWhatsApp = campaign.channel === "WHATSAPP";

  // Compute audience string for the server action
  const audience = audienceMode === "all" ? "all" : audienceMode === "segment" ? selectedSegment : "all";

  const recipientCount = audienceMode === "all"
    ? subscribedCount
    : audienceMode === "segment"
      ? availableSegments.find((s) => s.id === selectedSegment)?.contactCount ?? 0
      : subscribedCount; // tag filtering happens server-side

  const canSend =
    campaign.status === "DRAFT" &&
    (isWhatsApp || (senders.length > 0 && senderId)) &&
    (isWhatsApp || campaign.subject) &&
    campaign.htmlContent &&
    recipientCount > 0;

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError("");

    let result;
    if (sendMode === "schedule" && scheduledDate && scheduledTime) {
      const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      result = await scheduleCampaign(campaign.id, senderId, audience, scheduledAt);
    } else {
      result = await sendCampaign(campaign.id, senderId, audience);
    }

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
          {sendMode === "schedule" ? "Campagne planifiée !" : "Campagne envoyée !"}
        </h1>
        <p className="text-zinc-500 mb-8">
          {sendMode === "schedule"
            ? `« ${campaign.name} » sera envoyée le ${scheduledDate} à ${scheduledTime}.`
            : `« ${campaign.name} » a été envoyée. Les résultats apparaîtront dans les analytics.`
          }
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
      {!isWhatsApp ? (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Campagne</h2>
        <div>
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{campaign.name}</p>
          <p className="text-sm text-zinc-500 mt-1">
            Sujet : <span className="text-zinc-300">{campaign.subject || "—"}</span>
          </p>
        </div>
        {!campaign.subject && (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            Le sujet est requis.
            <Link href={`/dashboard/campaigns/${campaign.id}/edit`} className="text-orange-500 underline">Éditer</Link>
          </div>
        )}
        {!campaign.htmlContent && (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            Le contenu est requis.
            <Link href={`/dashboard/campaigns/${campaign.id}/edit`} className="text-orange-500 underline">Éditer</Link>
          </div>
        )}
      </div>
      ) : (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Canal
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          Envoi WhatsApp via la configuration de Messagerie. Seuls les contacts actifs avec un numéro WhatsApp seront ciblés.
        </p>
        <Link href="/dashboard/messaging" className="text-sm text-orange-500 hover:text-orange-400 font-medium">
          Vérifier WhatsApp
        </Link>
      </div>
      )}

      {/* Sender selection */}
      {!isWhatsApp && (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <AtSign className="h-4 w-4" />
          Expéditeur
        </h2>
        {senders.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {senders.map((s) => (
              <button
                key={s.id}
                onClick={() => setSenderId(s.id)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
                  senderId === s.id
                    ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                    : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
                }`}
              >
                {s.name} &lt;{s.email}&gt;
              </button>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 text-center">
            <p className="text-sm text-amber-400 mb-2">Aucun expéditeur configuré.</p>
            <Link href="/dashboard/senders" className="text-sm text-orange-500 hover:text-orange-400 font-medium">
              Configurer un expéditeur →
            </Link>
          </div>
        )}
        {selectedSender?.replyTo && (
          <p className="text-xs text-zinc-500">Réponses à : {selectedSender.replyTo}</p>
        )}
      </div>
      )}

      {/* Audience selection — toggle pills */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Users className="h-4 w-4" />
          Audience
        </h2>

        {/* Mode pills */}
        <div className="flex gap-2">
          <button
            onClick={() => setAudienceMode("all")}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
              audienceMode === "all"
                ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            {isWhatsApp ? "Contacts WhatsApp" : "Tous les abonnés"} ({subscribedCount})
          </button>
          {availableSegments.length > 0 && (
            <button
              onClick={() => setAudienceMode("segment")}
              className={`px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
                audienceMode === "segment"
                  ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                  : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
              }`}
            >
              Par segment
            </button>
          )}
          <button
            onClick={() => setAudienceMode("tag")}
            className={`px-3 py-2 rounded-lg text-sm border transition-colors cursor-pointer ${
              audienceMode === "tag"
                ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Tag className="h-3 w-3" />
              Par tag
            </span>
          </button>
        </div>

        {/* Segment sub-selection */}
        {audienceMode === "segment" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {availableSegments.map((seg) => (
              <button
                key={seg.id}
                onClick={() => setSelectedSegment(seg.id)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                  selectedSegment === seg.id
                    ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400"
                }`}
              >
                {seg.name} ({seg.contactCount})
              </button>
            ))}
          </div>
        )}

        {/* Tag sub-selection */}
        {audienceMode === "tag" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {availableTags.length > 0 ? (
              availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-colors cursor-pointer ${
                    selectedTag === tag
                      ? "border-orange-500/50 bg-orange-500/10 text-orange-400"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:border-zinc-400"
                  }`}
                >
                  {tag}
                </button>
              ))
            ) : (
              <p className="text-xs text-zinc-500 italic">Aucun tag. Ajoutez des tags à vos contacts pour filtrer par tag.</p>
            )}
          </div>
        )}

        {recipientCount === 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            {isWhatsApp ? "Aucun contact WhatsApp dans cette audience." : "Aucun abonné dans cette audience."}
          </div>
        )}
      </div>

      {/* Send mode: now or schedule */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Quand envoyer
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setSendMode("now")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
              sendMode === "now"
                ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            <Send className="h-4 w-4" />
            Envoyer maintenant
          </button>
          <button
            onClick={() => setSendMode("schedule")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
              sendMode === "schedule"
                ? "border-orange-500/50 bg-orange-500/10 text-orange-500"
                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Planifier
          </button>
        </div>
        {sendMode === "schedule" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Date</label>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">Heure</label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/30 cursor-pointer"
              />
            </div>
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
          {recipientCount > 0 && (isWhatsApp || senders.length > 0)
            ? `Prêt à envoyer à ${recipientCount} contact${recipientCount > 1 ? "s" : ""}`
            : "Complétez les étapes ci-dessus pour envoyer"}
        </p>
        <button
          onClick={handleSend}
          disabled={!canSend || sending || (sendMode === "schedule" && (!scheduledDate || !scheduledTime))}
          className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {sendMode === "schedule" ? "Planification..." : "Envoi en cours..."}
            </>
          ) : sendMode === "schedule" ? (
            <>
              <CalendarDays className="h-4 w-4" />
              Planifier l&apos;envoi
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
