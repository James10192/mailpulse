"use client";

import { useState, useActionState } from "react";
import { Plus, X, Trash2, Code } from "lucide-react";
import { createSnippet, deleteSnippet } from "./actions";
import type { ActionState } from "@/types/action-state";

interface SnippetData {
  id: string;
  name: string;
  htmlContent: string;
  createdAt: string;
}

export function SnippetsClient({
  snippets,
}: {
  snippets: SnippetData[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createSnippet(prev, formData);
      if (result?.success) setModalOpen(false);
      return result;
    },
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
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-left">
                  <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Nom</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 hidden sm:table-cell">Apercu</th>
                  <th className="px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400 hidden md:table-cell">Date</th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody>
                {snippets.map((snippet) => (
                  <tr
                    key={snippet.id}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                      {snippet.name}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 truncate max-w-[200px] hidden sm:table-cell">
                      {snippet.htmlContent.replace(/<[^>]*>/g, "").slice(0, 60)}
                      {snippet.htmlContent.length > 60 ? "..." : ""}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-xs hidden md:table-cell">
                      {new Date(snippet.createdAt).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(snippet.id)}
                        disabled={deleting === snippet.id}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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

      {/* Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
                <label
                  htmlFor="snippet-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Nom *
                </label>
                <input
                  id="snippet-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Signature, en-tete, footer..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label
                  htmlFor="snippet-content"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Contenu HTML *
                </label>
                <textarea
                  id="snippet-content"
                  name="htmlContent"
                  required
                  rows={6}
                  placeholder="<p>Votre contenu HTML ici...</p>"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 font-mono resize-y"
                />
              </div>

              {state?.error && (
                <p className="text-sm text-red-500">{state.error}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isPending ? "Creation..." : "Creer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
