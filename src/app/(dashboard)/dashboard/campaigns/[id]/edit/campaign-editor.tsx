"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Cloud, CloudOff, Send, Mail, MessageCircle } from "lucide-react";
import { updateCampaign } from "../../actions";
import { RichEditor } from "@/components/editor/rich-editor";
import { useAutosave } from "@/hooks/use-autosave";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CampaignData {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  channel: "EMAIL" | "WHATSAPP";
  status: string;
}

interface SnippetOption {
  id: string;
  name: string;
  htmlContent: string;
  channel: "EMAIL" | "WHATSAPP";
}

export function CampaignEditor({
  campaign,
  snippets = [],
}: {
  campaign: CampaignData;
  snippets?: SnippetOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [previewText, setPreviewText] = useState(campaign.previewText);
  const [htmlContent, setHtmlContent] = useState(campaign.htmlContent);
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">(campaign.channel);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const channelSnippets = snippets.filter((snippet) => snippet.channel === channel);

  const { autoStatus, setValue } = useAutosave({
    initial: { name: campaign.name, subject: campaign.subject, previewText: campaign.previewText, htmlContent: campaign.htmlContent, channel: campaign.channel },
    onSave: useCallback(
      (values: { name: string; subject: string; previewText: string; htmlContent: string; channel: "EMAIL" | "WHATSAPP" }) =>
        updateCampaign(campaign.id, values),
      [campaign.id]
    ),
  });

  function handleField<K extends "name" | "subject" | "previewText" | "htmlContent">(
    key: K,
    setter: (v: string) => void,
    value: string
  ) {
    setter(value);
    setValue(key, value);
  }

  function handleChannel(nextChannel: "EMAIL" | "WHATSAPP") {
    setChannel(nextChannel);
    setValue("channel", nextChannel);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const result = await updateCampaign(campaign.id, {
      name, subject, previewText, htmlContent, channel,
    }, { revalidate: true });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/dashboard/campaigns");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/campaigns"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Éditer la campagne
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Modifiez le contenu de votre campagne email
              </p>
              {autoStatus === "saving" && (
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                  <Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde auto...
                </span>
              )}
              {autoStatus === "saved" && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-mono">
                  <Cloud className="h-3 w-3" /> Sauvegarde
                </span>
              )}
              {autoStatus === "error" && (
                <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-mono">
                  <CloudOff className="h-3 w-3" /> Erreur auto-save
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {campaign.status === "DRAFT" && (
            <Link
              href={`/dashboard/campaigns/${campaign.id}/send`}
              className="inline-flex items-center gap-2 border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <Send className="h-4 w-4" />
              Envoyer
            </Link>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="gap-2 bg-orange-600 hover:bg-orange-500"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Enregistrer et quitter
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Details section */}
      <Card>
        <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Details</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Définissez le canal, le nom et le contenu de votre campagne.
          </p>
        </div>

        <div>
          <p className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
            Canal
          </p>
          <RadioGroup value={channel} onValueChange={(value) => handleChannel(value as "EMAIL" | "WHATSAPP")} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Label htmlFor="campaign-edit-email" className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${
              channel === "EMAIL"
                ? "border-orange-500/40 bg-orange-500/10 text-zinc-900 dark:text-zinc-100"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}>
              <RadioGroupItem id="campaign-edit-email" value="EMAIL" className="mt-0.5" />
              <Mail className="mt-0.5 h-4 w-4 text-orange-500" />
              <span>
                <span className="block font-medium">Email</span>
                <span className="mt-1 block text-xs text-zinc-500">Utilise sujet, aperçu, expéditeur et tracking.</span>
              </span>
            </Label>
            <Label htmlFor="campaign-edit-whatsapp" className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors ${
              channel === "WHATSAPP"
                ? "border-orange-500/40 bg-orange-500/10 text-zinc-900 dark:text-zinc-100"
                : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
            }`}>
              <RadioGroupItem id="campaign-edit-whatsapp" value="WHATSAPP" className="mt-0.5" />
              <MessageCircle className="mt-0.5 h-4 w-4 text-orange-500" />
              <span>
                <span className="block font-medium">WhatsApp</span>
                <span className="mt-1 block text-xs text-zinc-500">Envoie aux contacts avec téléphone WhatsApp.</span>
              </span>
            </Label>
          </RadioGroup>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Nom de la campagne
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleField("name", setName, e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            placeholder="Nom de la campagne"
          />
        </div>

        {channel === "EMAIL" && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Sujet de l&apos;email
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => handleField("subject", setSubject, e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            placeholder="Ex: Decouvrez nos nouveautes !"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Le sujet apparaît dans la boîte de réception. Variables disponibles : {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
          </p>
        </div>
        )}

        {channel === "EMAIL" && (
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Texte d&apos;apercu (optionnel)
          </label>
          <input
            type="text"
            value={previewText}
            onChange={(e) => handleField("previewText", setPreviewText, e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            placeholder="Texte visible après le sujet dans la boîte de réception"
          />
        </div>
        )}
        </CardContent>
      </Card>

      {/* Content section */}
      <Card>
        <CardContent className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
            {channel === "WHATSAPP" ? "Message WhatsApp" : "Contenu de l'email"}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {channel === "WHATSAPP"
              ? "Rédigez le message WhatsApp. Les variables personnalisent chaque contact."
              : "Rédigez le contenu de votre campagne. Utilisez les variables pour personnaliser chaque email."}
          </p>
        </div>

        <RichEditor
          content={htmlContent}
          onChange={(html) => handleField("htmlContent", setHtmlContent, html)}
          placeholder={channel === "WHATSAPP"
            ? "Écrivez le message WhatsApp... Variables disponibles : {{firstName}}, {{lastName}}, {{phone}}."
            : "Ecrivez le contenu de votre email... Utilisez le bouton Variables pour inserer des champs dynamiques."}
          snippets={channelSnippets}
        />
        </CardContent>
      </Card>
    </div>
  );
}
