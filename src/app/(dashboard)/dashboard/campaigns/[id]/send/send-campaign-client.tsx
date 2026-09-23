"use client";

import { useState } from "react";
import { Send, Users, AtSign, AlertTriangle, Check, Loader2, ArrowLeft, Clock, CalendarDays, Tag, MessageCircle, Smartphone } from "lucide-react";
import Link from "next/link";
import { scheduleCampaign } from "../../actions";
import { sendCampaign } from "../../campaign-sending-actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

// Selectable option pill: orange when pressed, neutral outline otherwise.
const PILL_CLASS =
  "h-auto min-w-0 whitespace-normal rounded-lg border border-zinc-200 px-3 py-2 font-normal text-zinc-500 hover:border-zinc-400 hover:bg-transparent hover:text-zinc-500 dark:border-zinc-700 data-[state=on]:border-orange-500/50 data-[state=on]:bg-orange-500/10 data-[state=on]:text-orange-500";
const SUB_PILL_CLASS = cn(PILL_CLASS, "py-1.5 text-xs dark:border-zinc-800 data-[state=on]:text-orange-400");

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
  const isSms = campaign.channel === "SMS";
  const isPhoneChannel = isWhatsApp || isSms;

  // Compute audience string for the server action
  const audience = audienceMode === "all"
    ? "all"
    : audienceMode === "segment"
      ? `list:${selectedSegment}`
      : `tag:${selectedTag}`;

  const recipientCount = audienceMode === "all"
    ? subscribedCount
    : audienceMode === "segment"
      ? availableSegments.find((s) => s.id === selectedSegment)?.contactCount ?? 0
      : subscribedCount; // tag filtering happens server-side

  const canSend =
    campaign.status === "DRAFT" &&
    (isPhoneChannel || (senders.length > 0 && senderId)) &&
    (isPhoneChannel || campaign.subject) &&
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
          {sendMode === "schedule"
            ? "Campagne planifiée !"
            : isSms
              ? "Campagne mise en file !"
              : "Campagne envoyée !"}
        </h1>
        <p className="text-zinc-500 mb-8">
          {sendMode === "schedule"
            ? `« ${campaign.name} » sera envoyée le ${scheduledDate} à ${scheduledTime}.`
            : isSms
              ? `« ${campaign.name} » attend la soumission à Orange CI. Les statuts apparaîtront au fil des accusés de réception.`
              : `« ${campaign.name} » a été envoyée. Les résultats apparaîtront dans les analytics.`
          }
        </p>
        <Button asChild>
          <Link href="/dashboard/campaigns">Retour aux campagnes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Envoyer la campagne
        </h1>
        <Button asChild variant="ghost" className="text-zinc-500">
          <Link href="/dashboard/campaigns">
            <ArrowLeft />
            Retour
          </Link>
        </Button>
      </div>

      {/* Campaign summary */}
      {!isPhoneChannel ? (
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
          {isSms ? <Smartphone className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
          Canal
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">
          {isSms
            ? "L’envoi SMS est mis en file d’attente pour Orange CI. Seuls les contacts actifs avec un numéro mobile seront ciblés."
            : "Envoi WhatsApp via la configuration de Messagerie. Seuls les contacts actifs avec un numéro WhatsApp seront ciblés."}
        </p>
        <Link href={isSms ? "/dashboard/sms" : "/dashboard/messaging"} className="text-sm text-orange-500 hover:text-orange-400 font-medium">
          {isSms ? "Vérifier SMS" : "Vérifier WhatsApp"}
        </Link>
      </div>
      )}

      {/* Sender selection */}
      {!isPhoneChannel && (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <AtSign className="h-4 w-4" />
          Expéditeur
        </h2>
        {senders.length > 0 ? (
          <ToggleGroup
            type="single"
            value={senderId}
            onValueChange={(value) => {
              if (value) setSenderId(value);
            }}
            aria-label="Expéditeur"
            className="flex-wrap gap-2"
          >
            {senders.map((s) => (
              <ToggleGroupItem key={s.id} value={s.id} className={PILL_CLASS}>
                {s.name} &lt;{s.email}&gt;
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
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
        <ToggleGroup
          type="single"
          value={audienceMode}
          onValueChange={(value) => {
            if (value) setAudienceMode(value as AudienceMode);
          }}
          aria-label="Audience"
          className="gap-2"
        >
          <ToggleGroupItem value="all" className={PILL_CLASS}>
            {isSms ? "Contacts SMS" : isWhatsApp ? "Contacts WhatsApp" : "Tous les abonnés"} ({subscribedCount})
          </ToggleGroupItem>
          {availableSegments.length > 0 && (
            <ToggleGroupItem value="segment" className={PILL_CLASS}>
              Par segment
            </ToggleGroupItem>
          )}
          <ToggleGroupItem value="tag" className={cn(PILL_CLASS, "gap-1.5 [&_svg:not([class*='size-'])]:size-3")}>
            <Tag />
            Par tag
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Segment sub-selection */}
        {audienceMode === "segment" && (
          <ToggleGroup
            type="single"
            value={selectedSegment}
            onValueChange={(value) => {
              if (value) setSelectedSegment(value);
            }}
            aria-label="Segment"
            className="flex-wrap gap-2 pt-1"
          >
            {availableSegments.map((seg) => (
              <ToggleGroupItem key={seg.id} value={seg.id} className={SUB_PILL_CLASS}>
                {seg.name} ({seg.contactCount})
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}

        {/* Tag sub-selection */}
        {audienceMode === "tag" && (
          <div className="flex flex-wrap gap-2 pt-1">
            {availableTags.length > 0 ? (
              <ToggleGroup
                type="single"
                value={selectedTag}
                onValueChange={(value) => {
                  if (value) setSelectedTag(value);
                }}
                aria-label="Tag"
                className="flex-wrap gap-2"
              >
                {availableTags.map((tag) => (
                  <ToggleGroupItem key={tag} value={tag} className={SUB_PILL_CLASS}>
                    {tag}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            ) : (
              <p className="text-xs text-zinc-500 italic">Aucun tag. Ajoutez des tags à vos contacts pour filtrer par tag.</p>
            )}
          </div>
        )}

        {recipientCount === 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-500">
            <AlertTriangle className="h-4 w-4" />
            {isSms ? "Aucun contact SMS dans cette audience." : isWhatsApp ? "Aucun contact WhatsApp dans cette audience." : "Aucun abonné dans cette audience."}
          </div>
        )}
      </div>

      {/* Send mode: now or schedule */}
      {!isSms && <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
        <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Quand envoyer
        </h2>
        <ToggleGroup
          type="single"
          value={sendMode}
          onValueChange={(value) => {
            if (value) setSendMode(value as "now" | "schedule");
          }}
          aria-label="Quand envoyer"
          className="w-full gap-2"
        >
          <ToggleGroupItem value="now" className={cn(PILL_CLASS, "flex-1 gap-2 px-4 py-3 font-medium")}>
            <Send />
            Envoyer maintenant
          </ToggleGroupItem>
          <ToggleGroupItem value="schedule" className={cn(PILL_CLASS, "flex-1 gap-2 px-4 py-3 font-medium")}>
            <CalendarDays />
            Planifier
          </ToggleGroupItem>
        </ToggleGroup>
        {sendMode === "schedule" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="schedule-date" className="text-xs font-normal text-zinc-500">
                Date
              </Label>
              <Input
                id="schedule-date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="schedule-time" className="text-xs font-normal text-zinc-500">
                Heure
              </Label>
              <Input
                id="schedule-time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>}

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="rounded-xl p-4">
          {error}
        </Alert>
      )}

      {/* Send button */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-zinc-500">
          {recipientCount > 0 && (isPhoneChannel || senders.length > 0)
            ? isSms
              ? `Prêt à mettre ${recipientCount} SMS en file d’attente`
              : `Prêt à envoyer à ${recipientCount} contact${recipientCount > 1 ? "s" : ""}`
            : "Complétez les étapes ci-dessus pour envoyer"}
        </p>
        <Button
          size="lg"
          onClick={handleSend}
          disabled={!canSend || sending || (sendMode === "schedule" && (!scheduledDate || !scheduledTime))}
          className="rounded-xl font-semibold"
        >
          {sending ? (
            <>
              <Loader2 className="animate-spin" />
              {sendMode === "schedule" ? "Planification..." : "Envoi en cours..."}
            </>
          ) : sendMode === "schedule" ? (
            <>
              <CalendarDays />
              Planifier l&apos;envoi
            </>
          ) : (
            <>
              <Send />
              Confirmer et envoyer
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
