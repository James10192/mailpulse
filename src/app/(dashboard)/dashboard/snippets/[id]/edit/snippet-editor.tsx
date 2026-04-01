"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, Cloud, CloudOff } from "lucide-react";
import { updateSnippet } from "../../actions";
import { RichEditor } from "@/components/editor/rich-editor";
import { useAutosave } from "@/hooks/use-autosave";

interface SnippetData {
  id: string;
  name: string;
  description: string | null;
  htmlContent: string;
}

interface SnippetOption {
  id: string;
  name: string;
  htmlContent: string;
}

export function SnippetEditor({ snippet, snippets = [] }: { snippet: SnippetData; snippets?: SnippetOption[] }) {
  const [name, setName] = useState(snippet.name);
  const [description, setDescription] = useState(snippet.description ?? "");
  const [htmlContent, setHtmlContent] = useState(snippet.htmlContent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const { autoStatus, setValue } = useAutosave({
    initial: { name: snippet.name, description: snippet.description ?? "", htmlContent: snippet.htmlContent },
    onSave: useCallback(
      (values: { name: string; description: string; htmlContent: string }) =>
        updateSnippet(snippet.id, {
          name: values.name,
          description: values.description || undefined,
          htmlContent: values.htmlContent,
        }),
      [snippet.id]
    ),
  });

  function handleField<K extends "name" | "description" | "htmlContent">(
    key: K,
    setter: (v: string) => void,
    value: string
  ) {
    setter(value);
    setValue(key, value);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const result = await updateSnippet(snippet.id, {
      name,
      description: description || undefined,
      htmlContent,
    });
    setSaving(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.push("/dashboard/snippets");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/snippets"
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Editer le snippet
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Modifiez le contenu de votre snippet email
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
            Definissez le nom et la description de votre snippet.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Nom
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleField("name", setName, e.target.value)}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            placeholder="Nom du snippet"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Description (optionnel)
          </label>
          <textarea
            value={description}
            onChange={(e) => handleField("description", setDescription, e.target.value)}
            rows={2}
            className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
            placeholder="Decrivez votre snippet..."
          />
        </div>
      </div>

      {/* Content section */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Contenu</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            Creez le contenu reutilisable pour vos emails. Utilisez les variables pour personnaliser.
          </p>
        </div>

        <RichEditor
          content={htmlContent}
          onChange={(html) => handleField("htmlContent", setHtmlContent, html)}
          placeholder="Ecrivez votre contenu ici... Utilisez le bouton Variables pour inserer des champs dynamiques."
          snippets={snippets}
        />
      </div>
    </div>
  );
}
