"use client";

import { useState, useActionState, useCallback } from "react";
import { Plus, X, Trash2, Code, Pencil, Eye, Calendar, Sparkles, Info } from "lucide-react";
import Link from "next/link";
import { createSnippetAndRedirect, deleteSnippet } from "./actions";
import { LimitWarningBanner } from "@/components/dashboard/feature-gate";
import type { ActionState } from "@/types/action-state";

interface SnippetData {
  id: string;
  name: string;
  description: string | null;
  htmlContent: string;
  createdAt: string;
}

// Wrap HTML content in a minimal document for iframe rendering
function wrapHtmlForPreview(html: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.5;
    color: #d4d4d8;
    background: #09090b;
    padding: 12px;
    overflow: hidden;
  }
  img { max-width: 100%; height: auto; display: block; }
  img.mx-auto, img[style*="margin: 0 auto"], p[style*="text-align: center"] img { margin: 0 auto; }
  .block { display: block; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .my-4 { margin-top: 1rem; margin-bottom: 1rem; }
  .rounded-lg { border-radius: 0.5rem; }
  p[style*="text-align: center"], div[style*="text-align: center"] { text-align: center; }
  p[style*="text-align: right"], div[style*="text-align: right"] { text-align: right; }
  a { color: #f97316; }
  h1 { font-size: 1.5em; font-weight: bold; margin: 0.5em 0; }
  h2 { font-size: 1.25em; font-weight: bold; margin: 0.5em 0; }
  h3 { font-size: 1.1em; font-weight: bold; margin: 0.5em 0; }
  ul, ol { padding-left: 1.5em; margin: 0.5em 0; }
  blockquote { border-left: 3px solid #52525b; padding-left: 1em; margin: 0.5em 0; color: #a1a1aa; }
  hr { border: none; border-top: 1px solid #3f3f46; margin: 1em 0; }
  table { border-collapse: collapse; width: 100%; }
  td, th { padding: 4px 8px; border: 1px solid #3f3f46; }
  th { background: #27272a; }
  code { background: #27272a; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
  pre { background: #18181b; padding: 12px; border-radius: 6px; overflow-x: auto; }
  .mention { background: rgba(249,115,22,0.1); color: #f97316; padding: 0 4px; border-radius: 3px; font-family: monospace; font-size: 0.9em; }
</style>
</head>
<body>${html}</body>
</html>`;
}

function SnippetCard({
  snippet,
  deleting,
  onDelete,
  onPreview,
}: {
  snippet: SnippetData;
  deleting: boolean;
  onDelete: (id: string) => void;
  onPreview: (snippet: SnippetData) => void;
}) {
  const hasContent =
    snippet.htmlContent && snippet.htmlContent !== "<p></p>";

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors flex flex-col">
      {/* Clickable preview area */}
      <button
        type="button"
        onClick={() => onPreview(snippet)}
        className="relative h-36 bg-zinc-950 overflow-hidden cursor-pointer text-left w-full"
      >
        {hasContent ? (
          <iframe
            srcDoc={wrapHtmlForPreview(snippet.htmlContent)}
            sandbox="allow-same-origin"
            title={`Apercu de ${snippet.name}`}
            className="w-full h-full pointer-events-none border-0 scale-100"
            tabIndex={-1}
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Code className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
          </div>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            Apercu
          </span>
        </div>
      </button>

      {/* Info section */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
            {snippet.name}
          </h3>
          {snippet.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
              {snippet.description}
            </p>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(snippet.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <Link
              href={`/dashboard/snippets/${snippet.id}/edit`}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors cursor-pointer"
              title="Editer"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(snippet.id);
              }}
              disabled={deleting}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
              title="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewModal({
  snippet,
  onClose,
}: {
  snippet: SnippetData;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="min-w-0 mr-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {snippet.name}
            </h2>
            {snippet.description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {snippet.description}
              </p>
            )}
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Cree le{" "}
              {new Date(snippet.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-hidden p-1">
          <iframe
            srcDoc={wrapHtmlForPreview(snippet.htmlContent)}
            sandbox="allow-same-origin"
            title={`Apercu complet de ${snippet.name}`}
            className="w-full h-full min-h-[300px] border-0 rounded-lg bg-zinc-950"
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Fermer
          </button>
          <Link
            href={`/dashboard/snippets/${snippet.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editer
          </Link>
        </div>
      </div>
    </div>
  );
}

export function SnippetsClient({
  snippets,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  snippets: SnippetData[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [previewSnippet, setPreviewSnippet] = useState<SnippetData | null>(
    null
  );
  const [deleting, setDeleting] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createSnippetAndRedirect,
    null
  );

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Supprimer ce snippet ?")) return;
    setDeleting(id);
    const result = await deleteSnippet(id);
    setDeleting(null);
    if (result?.error) alert(result.error);
  }, []);

  const handlePreview = useCallback((snippet: SnippetData) => {
    setPreviewSnippet(snippet);
  }, []);

  return (
    <>
      <div className="space-y-6">
        {overLimit && limit !== -1 && (
          <LimitWarningBanner
            resourceLabel="snippets"
            current={currentCount}
            limit={limit}
            planLabel={planLabel}
            actionLabel="Vous ne pouvez plus en creer. Passez au Pro pour des snippets illimites."
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Email Snippets
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Creez des blocs de contenu reutilisables pour vos emails
            </p>
          </div>
          {canCreate ? (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nouveau snippet
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {currentCount}/{limit === -1 ? "\u221E" : limit} snippets
              </span>
              <Link
                href="/dashboard/settings/billing"
                className="inline-flex items-center gap-2 bg-orange-600/20 text-orange-400 border border-orange-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-orange-600/30"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Passer au Pro
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-300/80">
            Les snippets sont des blocs de contenu reutilisables dans vos campagnes. Creez des en-tetes, pieds de page, ou sections recurrentes que vous pouvez inserer facilement.
          </p>
        </div>

        {snippets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {snippets.map((snippet) => (
              <SnippetCard
                key={snippet.id}
                snippet={snippet}
                deleting={deleting === snippet.id}
                onDelete={handleDelete}
                onPreview={handlePreview}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 p-16 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 dark:bg-orange-500/10 mb-4">
              <Code className="h-7 w-7 text-orange-500" />
            </div>
            <h3 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
              Aucun snippet
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 max-w-sm mx-auto">
              Les snippets sont des blocs de contenu reutilisables que vous
              pouvez inserer dans vos emails en un clic.
            </p>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Creez votre premier snippet
            </button>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewSnippet && (
        <PreviewModal
          snippet={previewSnippet}
          onClose={() => setPreviewSnippet(null)}
        />
      )}

      {/* Create modal */}
      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCreateModalOpen(false);
          }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Nouveau snippet
              </h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label
                  htmlFor="snippet-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Nom du snippet *
                </label>
                <input
                  id="snippet-name"
                  name="name"
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Signature, En-tete, Footer..."
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
                <p className="mt-1.5 text-xs text-zinc-500">
                  Vous pourrez editer le contenu sur la page suivante.
                </p>
              </div>

              {state?.error && (
                <p className="text-sm text-red-500">{state.error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Creation..." : "Creer et editer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
