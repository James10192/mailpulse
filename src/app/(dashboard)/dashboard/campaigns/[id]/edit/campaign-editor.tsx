"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Cloud, CloudOff, Send } from "lucide-react";
import { updateCampaign } from "../../actions";
import { RichEditor } from "@/components/editor/rich-editor";

interface CampaignData {
  id: string;
  name: string;
  subject: string;
  previewText: string;
  htmlContent: string;
  status: string;
}

interface SnippetOption {
  id: string;
  name: string;
  htmlContent: string;
}

type AutosaveStatus = "idle" | "saving" | "saved" | "error";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoStatus, setAutoStatus] = useState<AutosaveStatus>("idle");

  // Refs for autosave
  const nameRef = useRef(name);
  const subjectRef = useRef(subject);
  const previewRef = useRef(previewText);
  const contentRef = useRef(htmlContent);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef({ name: campaign.name, subject: campaign.subject, previewText: campaign.previewText, htmlContent: campaign.htmlContent });

  nameRef.current = name;
  subjectRef.current = subject;
  previewRef.current = previewText;
  contentRef.current = htmlContent;

  const doAutoSave = useCallback(async () => {
    const current = { name: nameRef.current, subject: subjectRef.current, previewText: previewRef.current, htmlContent: contentRef.current };
    // Skip if nothing changed
    if (
      current.name === lastSaved.current.name &&
      current.subject === lastSaved.current.subject &&
      current.previewText === lastSaved.current.previewText &&
      current.htmlContent === lastSaved.current.htmlContent
    ) return;

    setAutoStatus("saving");
    const result = await updateCampaign(campaign.id, current);
    if (result?.error) {
      setAutoStatus("error");
    } else {
      lastSaved.current = current;
      setAutoStatus("saved");
      setTimeout(() => setAutoStatus("idle"), 2000);
    }
  }, [campaign.id]);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(doAutoSave, 2000);
  }, [doAutoSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (autoSaveTimer.current) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleContentChange = useCallback((html: string) => {
    setHtmlContent(html);
    scheduleAutoSave();
  }, [scheduleAutoSave]);

  const handleNameChange = useCallback((val: string) => { setName(val); scheduleAutoSave(); }, [scheduleAutoSave]);
  const handleSubjectChange = useCallback((val: string) => { setSubject(val); scheduleAutoSave(); }, [scheduleAutoSave]);
  const handlePreviewChange = useCallback((val: string) => { setPreviewText(val); scheduleAutoSave(); }, [scheduleAutoSave]);

  async function handleSave() {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    setSaving(true);
    setError("");
    const result = await updateCampaign(campaign.id, {
      name,
      subject,
      previewText,
      htmlContent,
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
              Editer la campagne
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
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
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Details section */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Details</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Definissez le nom, sujet et apercu de votre campagne.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Nom de la campagne
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            placeholder="Nom de la campagne"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Sujet de l&apos;email
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            placeholder="Ex: Decouvrez nos nouveautes !"
          />
          <p className="text-xs text-zinc-500 mt-1">
            Le sujet apparait dans la boite de reception. Variables disponibles : {"{{firstName}}"}, {"{{lastName}}"}, {"{{email}}"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Texte d&apos;apercu (optionnel)
          </label>
          <input
            type="text"
            value={previewText}
            onChange={(e) => handlePreviewChange(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            placeholder="Texte visible apres le sujet dans la boite de reception"
          />
        </div>
      </div>

      {/* Content section */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Contenu de l&apos;email</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Redigez le contenu de votre campagne. Utilisez les variables pour personnaliser chaque email.
          </p>
        </div>

        <RichEditor
          content={htmlContent}
          onChange={handleContentChange}
          placeholder="Ecrivez le contenu de votre email... Utilisez le bouton Variables pour inserer des champs dynamiques."
          snippets={snippets}
        />
      </div>
    </div>
  );
}
