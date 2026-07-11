"use client";

import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Cloud, CloudOff, Loader2, Mail, MessageCircle, Save, Send } from "lucide-react";
import { updateCampaign } from "../../actions";
import { RichEditor } from "@/components/editor/rich-editor";
import { WhatsAppComposer } from "@/components/editor/whatsapp-composer";
import { useAutosave } from "@/hooks/use-autosave";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { htmlToPlainText } from "@/lib/message-content";

interface CampaignData {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  channel: "EMAIL" | "WHATSAPP";
  status: string;
  whatsappImageUrl: string | null;
  whatsappImageName: string | null;
}

interface SnippetOption {
  id: string;
  name: string;
  htmlContent: string;
  channel: "EMAIL" | "WHATSAPP";
  whatsappImageUrl: string | null;
  whatsappImageName: string | null;
}

type AutosaveValues = {
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  channel: "EMAIL" | "WHATSAPP";
  whatsappImageUrl: string | null;
  whatsappImageName: string | null;
};

export function CampaignEditor({ campaign, snippets = [] }: { campaign: CampaignData; snippets?: SnippetOption[] }) {
  const router = useRouter();
  const [name, setName] = useState(campaign.name);
  const [subject, setSubject] = useState(campaign.subject);
  const [previewText, setPreviewText] = useState(campaign.previewText);
  const [htmlContent, setHtmlContent] = useState(
    campaign.channel === "WHATSAPP" ? htmlToPlainText(campaign.htmlContent) : campaign.htmlContent,
  );
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">(campaign.channel);
  const [whatsappImageUrl, setWhatsappImageUrl] = useState<string | null>(campaign.whatsappImageUrl);
  const [whatsappImageName, setWhatsappImageName] = useState<string | null>(campaign.whatsappImageName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const channelSnippets = snippets.filter((snippet) => snippet.channel === channel);
  const plainText = htmlToPlainText(htmlContent);
  const isEmail = channel === "EMAIL";
  const canSend = isEmail ? Boolean(subject.trim() && htmlContent.trim()) : Boolean(plainText.trim());

  const { autoStatus, setValue } = useAutosave<AutosaveValues>({
    initial: {
      name: campaign.name,
      subject: campaign.subject,
      previewText: campaign.previewText,
      htmlContent: campaign.channel === "WHATSAPP" ? htmlToPlainText(campaign.htmlContent) : campaign.htmlContent,
      channel: campaign.channel,
      whatsappImageUrl: campaign.whatsappImageUrl,
      whatsappImageName: campaign.whatsappImageName,
    },
    onSave: useCallback(
      (values: AutosaveValues) => updateCampaign(campaign.id, values),
      [campaign.id],
    ),
  });

  function handleField<K extends keyof AutosaveValues>(key: K, value: AutosaveValues[K]) {
    if (key === "name") setName(value as string);
    if (key === "subject") setSubject(value as string);
    if (key === "previewText") setPreviewText(value as string);
    if (key === "htmlContent") setHtmlContent(value as string);
    if (key === "channel") setChannel(value as "EMAIL" | "WHATSAPP");
    if (key === "whatsappImageUrl") setWhatsappImageUrl(value as string | null);
    if (key === "whatsappImageName") setWhatsappImageName(value as string | null);
    setValue(key, value);
  }

  function handleChannel(nextChannel: "EMAIL" | "WHATSAPP") {
    const nextContent = nextChannel === "WHATSAPP" ? htmlToPlainText(htmlContent) : htmlContent;
    handleField("channel", nextChannel);
    handleField("htmlContent", nextContent);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const result = await updateCampaign(campaign.id, {
      name,
      subject,
      previewText,
      htmlContent,
      channel,
      whatsappImageUrl,
      whatsappImageName,
    }, { revalidate: true });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/dashboard/campaigns");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link
            href="/dashboard/campaigns"
            className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition-[color,background-color] hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-balance text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Éditer la campagne
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span className="text-pretty">Préparez le contenu, l’aperçu et le prochain envoi.</span>
              <AutosaveBadge status={autoStatus} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          {campaign.status === "DRAFT" && (
            <Button asChild variant="outline" className="h-11 gap-2">
              <Link href={`/dashboard/campaigns/${campaign.id}/send`}>
                <Send className="h-4 w-4" />
                Envoyer
              </Link>
            </Button>
          )}
          <Button type="button" onClick={handleSave} disabled={saving} className="h-11 gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer et quitter
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-5 p-5">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Détails</h2>
                <p className="mt-1 text-sm text-zinc-500 text-pretty dark:text-zinc-400">
                  Canal, nom interne et informations visibles par les destinataires.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Canal</Label>
                <RadioGroup value={channel} onValueChange={(value) => handleChannel(value as "EMAIL" | "WHATSAPP")} className="grid gap-3 sm:grid-cols-2">
                  <ChannelOption id="campaign-edit-email" value="EMAIL" active={channel === "EMAIL"} icon={<Mail className="h-4 w-4" />} title="Email" description="Sujet, préheader, contenu riche et tracking." />
                  <ChannelOption id="campaign-edit-whatsapp" value="WHATSAPP" active={channel === "WHATSAPP"} icon={<MessageCircle className="h-4 w-4" />} title="WhatsApp" description="Texte court, variables et image envoyée à côté." />
                </RadioGroup>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Nom de la campagne</Label>
                  <Input id="campaign-name" value={name} onChange={(event) => handleField("name", event.target.value)} placeholder="Nom interne" />
                </div>

                {isEmail && (
                  <div className="space-y-2">
                    <Label htmlFor="campaign-subject">Sujet de l’email</Label>
                    <Input id="campaign-subject" value={subject} onChange={(event) => handleField("subject", event.target.value)} placeholder="Découvrez nos nouveautés" />
                  </div>
                )}
              </div>

              {isEmail && (
                <div className="space-y-2">
                  <Label htmlFor="campaign-preview">Texte d’aperçu</Label>
                  <Input id="campaign-preview" value={previewText} onChange={(event) => handleField("previewText", event.target.value)} placeholder="Texte visible après le sujet" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {isEmail ? "Composer email" : "Composer WhatsApp"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500 text-pretty dark:text-zinc-400">
                  {isEmail
                    ? "Écrivez le contenu riche. Les variables restent disponibles pour personnaliser chaque contact."
                    : "Écrivez le message, ajoutez une image séparée si nécessaire, puis vérifiez l’aperçu."}
                </p>
              </div>

              {isEmail ? (
                <RichEditor
                  content={htmlContent}
                  onChange={(html) => handleField("htmlContent", html)}
                  placeholder="Écrivez le contenu de votre email..."
                  snippets={channelSnippets}
                />
              ) : (
                <WhatsAppComposer
                  value={htmlContent}
                  onChange={(value) => handleField("htmlContent", value)}
                  imageUrl={whatsappImageUrl}
                  imageName={whatsappImageName}
                  onImageChange={(image) => {
                    handleField("whatsappImageUrl", image.url);
                    handleField("whatsappImageName", image.name);
                  }}
                  snippets={channelSnippets}
                />
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Aperçu</h2>
                  <p className="mt-1 text-sm text-zinc-500">État de complétion.</p>
                </div>
                <Badge variant={canSend ? "success" : "warning"}>{canSend ? "Prête" : "À compléter"}</Badge>
              </div>

              <div className="space-y-3 text-sm">
                <ChecklistItem done={Boolean(name.trim())} label="Nom renseigné" />
                <ChecklistItem done={isEmail ? Boolean(subject.trim()) : Boolean(plainText.trim())} label={isEmail ? "Sujet renseigné" : "Message renseigné"} />
                <ChecklistItem done={Boolean(htmlContent.trim())} label="Contenu enregistré" />
                {!isEmail && <ChecklistItem done={Boolean(whatsappImageUrl)} label="Image optionnelle" optional />}
              </div>

              <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{isEmail ? "Email" : "WhatsApp"}</p>
                <p className="mt-2 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{name || "Campagne sans nom"}</p>
                {isEmail ? (
                  <>
                    <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{subject || "Sujet non défini"}</p>
                    <p className="mt-1 text-xs text-zinc-500">{previewText || "Texte d’aperçu non défini"}</p>
                  </>
                ) : (
                  <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {plainText || "Message non défini"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AutosaveBadge({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  if (status === "saving") return <span className="inline-flex items-center gap-1 text-xs text-zinc-500"><Loader2 className="h-3 w-3 animate-spin" /> Sauvegarde auto</span>;
  if (status === "saved") return <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Cloud className="h-3 w-3" /> Sauvegardé</span>;
  if (status === "error") return <span className="inline-flex items-center gap-1 text-xs text-red-600"><CloudOff className="h-3 w-3" /> Erreur autosave</span>;
  return null;
}

function ChannelOption({ id, value, active, icon, title, description }: { id: string; value: "EMAIL" | "WHATSAPP"; active: boolean; icon: ReactNode; title: string; description: string }) {
  return (
    <Label
      htmlFor={id}
      className={`flex min-h-20 cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-[background-color,border-color,color,box-shadow] ${
        active
          ? "border-orange-500/50 bg-orange-500/10 text-zinc-900 shadow-[0_0_0_1px_rgba(249,115,22,0.2)] dark:text-zinc-100"
          : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900"
      }`}
    >
      <RadioGroupItem id={id} value={value} className="mt-0.5" />
      <span className="mt-0.5 text-orange-600">{icon}</span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-1 block text-xs text-zinc-500 text-pretty">{description}</span>
      </span>
    </Label>
  );
}

function ChecklistItem({ done, label, optional = false }: { done: boolean; label: string; optional?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className={`inline-flex items-center gap-1 text-xs ${done ? "text-emerald-600" : optional ? "text-zinc-400" : "text-amber-600"}`}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {done ? "OK" : optional ? "Optionnel" : "Manquant"}
      </span>
    </div>
  );
}
