"use client";

import { useState, useActionState } from "react";
import { Plus, X, Trash2, Code, Pencil } from "lucide-react";
import Link from "next/link";
import { createSnippetAndRedirect, deleteSnippet } from "./actions";
import type { ActionState } from "@/types/action-state";

interface SnippetData {
  id: string;
  name: string;
  htmlContent: string;
  createdAt: string;
}

export function SnippetsClient({ snippets }: { snippets: SnippetData[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    createSnippetAndRedirect,
    null
  );

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce snippet ?")) return;
    setDeleting(id);
    const result = await deleteSnippet(id);
    setDeleting(null);
    if (result?.error) alert(result.error);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Email Snippets
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Creez des blocs de contenu reutilisables pour vos emails
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Nouveau snippet
          </button>
        </div>

        {snippets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {snippets.map((snippet) => (
              <div
                key={snippet.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Preview area */}
                <div className="h-28 bg-zinc-50 dark:bg-zinc-800/30 p-4 overflow-hidden">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-4">
                    {snippet.htmlContent
                      ? snippet.htmlContent.replace(/<[^>]*>/g, "").slice(0, 200)
                      : "Contenu vide"}
                  </p>
                </div>

                {/* Info */}
                <div className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {snippet.name}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(snippet.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/dashboard/snippets/${snippet.id}/edit`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors cursor-pointer"
                      title="Editer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(snippet.id)}
                      disabled={deleting === snippet.id}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
            <Code className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-4">
              Aucun snippet pour le moment.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="text-orange-500 hover:text-orange-400 text-sm font-medium cursor-pointer"
            >
              Creer votre premier snippet
            </button>
          </div>
        )}
      </div>

      {/* Create modal — name only, then redirect to edit page */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Nouveau snippet
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label htmlFor="snippet-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
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
                  onClick={() => setModalOpen(false)}
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
