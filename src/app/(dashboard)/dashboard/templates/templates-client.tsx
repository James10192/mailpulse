"use client";

import { useState, useActionState } from "react";
import { Plus, X, Trash2, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { createTemplate, deleteTemplate } from "./actions";
import { LimitWarningBanner } from "@/components/dashboard/feature-gate";
import type { ActionState } from "@/types/action-state";

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  createdAt: string;
}

const categoryLabels: Record<string, string> = {
  custom: "Personnalise",
  welcome: "Bienvenue",
  newsletter: "Newsletter",
  promotion: "Promotion",
  transactional: "Transactionnel",
};

export function TemplatesClient({
  templates,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  templates: TemplateData[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createTemplate(prev, formData);
      if (result?.success) setModalOpen(false);
      return result;
    },
    null
  );

  async function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    setDeleting(id);
    const result = await deleteTemplate(id);
    setDeleting(null);
    if (result?.error) alert(result.error);
  }

  return (
    <>
      <div className="space-y-6">
        {overLimit && limit !== -1 && (
          <LimitWarningBanner
            resourceLabel="templates"
            current={currentCount}
            limit={limit}
            planLabel={planLabel}
            actionLabel="Vous ne pouvez plus en creer. Passez au Pro pour des templates illimites."
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Templates
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Creez et gerez vos modeles d&apos;email
            </p>
          </div>
          {canCreate ? (
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nouveau template
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {currentCount}/{limit === -1 ? "\u221E" : limit} templates
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

        {templates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="h-40 bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {template.name}
                      </h3>
                      {template.description && (
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                          {template.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(template.id)}
                      disabled={deleting === template.id}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                      {categoryLabels[template.category] ?? template.category}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {new Date(template.createdAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
            <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-4">
              Aucun template pour le moment.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="text-orange-500 hover:text-orange-400 text-sm font-medium cursor-pointer"
            >
              Creer votre premier template
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
                Nouveau template
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
                  htmlFor="template-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Nom *
                </label>
                <input
                  id="template-name"
                  name="name"
                  type="text"
                  required
                  placeholder="Newsletter mensuelle"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label
                  htmlFor="template-description"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Description
                </label>
                <input
                  id="template-description"
                  name="description"
                  type="text"
                  placeholder="Description optionnelle"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label
                  htmlFor="template-category"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Categorie
                </label>
                <select
                  id="template-category"
                  name="category"
                  defaultValue="custom"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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
