"use client";

import { useState, useActionState } from "react";
import { Plus, Zap, X, Trash2, Pencil, PauseCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAutomation, deleteAutomation, updateAutomationStatus } from "./actions";
import { cn } from "@/lib/utils";
import { LimitWarningBanner } from "@/components/dashboard/feature-gate";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import type { ActionState } from "@/types/action-state";

interface AutomationData {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  status: string;
  createdAt: string;
}

const triggerLabels: Record<string, string> = {
  SUBSCRIBER_ADDED: "Nouvel abonne",
  TAG_ADDED: "Tag ajoute",
  CAMPAIGN_OPENED: "Campagne ouverte",
  LINK_CLICKED: "Lien clique",
  DATE_BASED: "Base sur la date",
  CUSTOM_EVENT: "Evenement personnalise",
};

const statusConfig: Record<string, { label: string; classes: string }> = {
  DRAFT: {
    label: "Brouillon",
    classes:
      "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
  },
  ACTIVE: {
    label: "Actif",
    classes:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  PAUSED: {
    label: "En pause",
    classes:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  ARCHIVED: {
    label: "Archive",
    classes:
      "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400",
  },
};

const presets = [
  {
    name: "Serie de bienvenue",
    desc: "Envoyez une sequence d'emails aux nouveaux abonnes",
    triggerLabel: "Nouvel abonne",
    triggerValue: "SUBSCRIBER_ADDED",
  },
  {
    name: "Re-engagement",
    desc: "Ciblez les contacts inactifs depuis 30 jours",
    triggerLabel: "Inactivite",
    triggerValue: "DATE_BASED",
  },
  {
    name: "Anniversaire",
    desc: "Email automatique pour l'anniversaire du contact",
    triggerLabel: "Date",
    triggerValue: "DATE_BASED",
  },
];

export function AutomationsClient({
  automations,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  automations: AutomationData[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [presetTrigger, setPresetTrigger] = useState("SUBSCRIBER_ADDED");
  const [presetDesc, setPresetDesc] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pausing, setPausing] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createAutomation(prev, formData);
      if (result?.success) setModalOpen(false);
      return result;
    },
    null
  );

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    const result = await deleteAutomation(id);
    setDeleting(null);
    if (result?.error) alert(result.error);
  }

  async function handlePause(id: string) {
    setPausing(id);
    const result = await updateAutomationStatus(id, "PAUSED");
    setPausing(null);
    if (result?.error) alert(result.error);
  }

  return (
    <>
      <div className="space-y-6">
        {overLimit && limit !== -1 && (
          <LimitWarningBanner
            resourceLabel="automations"
            current={currentCount}
            limit={limit}
            planLabel={planLabel}
            actionLabel="Les automations en exces ont ete mises en pause automatiquement. Passez au Pro pour toutes les reactiver."
          />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Automations
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Workflows automatises pour vos campagnes
            </p>
          </div>
          {canCreate ? (
            <button
              onClick={() => {
                setPresetName("");
                setPresetTrigger("SUBSCRIBER_ADDED");
                setPresetDesc("");
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Nouvelle automation
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">
                {currentCount}/{limit === -1 ? "∞" : limit} automations
              </span>
              <Link
                href="/dashboard/settings/billing"
                className="inline-flex items-center gap-2 bg-orange-600/20 text-orange-400 border border-orange-500/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer hover:bg-orange-600/30"
              >
                Passer au Pro
              </Link>
            </div>
          )}
        </div>

        {/* Preset cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                if (!canCreate) return;
                setPresetName(preset.name);
                setPresetTrigger(preset.triggerValue);
                setPresetDesc(preset.desc);
                setModalOpen(true);
              }}
              disabled={!canCreate}
              className={cn(
                "p-5 rounded-xl border border-dashed text-left transition-colors group bg-white dark:bg-transparent",
                canCreate
                  ? "border-zinc-300 dark:border-zinc-700 hover:border-orange-500/50 cursor-pointer"
                  : "border-zinc-200 dark:border-zinc-800 opacity-50 cursor-not-allowed"
              )}
            >
              <Zap className="h-5 w-5 text-zinc-400 dark:text-zinc-500 group-hover:text-orange-500 mb-3 transition-colors" />
              <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                {preset.name}
              </h3>
              <p className="text-xs text-zinc-500 mt-1">{preset.desc}</p>
              <div className="mt-3 inline-block text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                {preset.triggerLabel}
              </div>
            </button>
          ))}
        </div>

        {/* Automations list */}
        {automations.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Nom
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden sm:table-cell">
                      Declencheur
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                      Statut
                    </th>
                    <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">
                      Date
                    </th>
                    <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {automations.map((auto) => {
                    const badge = statusConfig[auto.status] ?? statusConfig.DRAFT;
                    return (
                      <tr
                        key={auto.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/automations/${auto.id}/edit`}
                            className="text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:text-orange-500 transition-colors cursor-pointer"
                          >
                            {auto.name}
                          </Link>
                          {auto.description && (
                            <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">
                              {auto.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            {triggerLabels[auto.trigger] ?? auto.trigger}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${badge.classes}`}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-zinc-500 font-mono hidden md:table-cell">
                          {new Date(auto.createdAt).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {overLimit && (auto.status === "ACTIVE" || auto.status === "DRAFT") && (
                              <button
                                onClick={() => handlePause(auto.id)}
                                disabled={pausing === auto.id}
                                className="p-1.5 rounded-lg text-amber-500 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer disabled:opacity-50"
                                title="Desactiver"
                              >
                                <PauseCircle className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteId(auto.id)}
                              disabled={deleting === auto.id}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
            <div className="text-zinc-500 text-sm">
              Aucune automation active. Choisissez un modele ci-dessus ou
              creez-en une personnalisee.
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Nouvelle automation
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
                  htmlFor="automation-name"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Nom *
                </label>
                <input
                  id="automation-name"
                  name="name"
                  type="text"
                  required
                  defaultValue={presetName}
                  key={`name-${presetName}`}
                  placeholder="Serie de bienvenue"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label
                  htmlFor="automation-description"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Description
                </label>
                <input
                  id="automation-description"
                  name="description"
                  type="text"
                  defaultValue={presetDesc}
                  key={`desc-${presetDesc}`}
                  placeholder="Description optionnelle"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label
                  htmlFor="automation-trigger"
                  className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5"
                >
                  Declencheur *
                </label>
                <select
                  id="automation-trigger"
                  name="trigger"
                  required
                  defaultValue={presetTrigger}
                  key={`trigger-${presetTrigger}`}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  {Object.entries(triggerLabels).map(([value, label]) => (
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

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer cette automation ?"
        message="Cette action est irreversible. L'automation et toutes ses etapes seront supprimees definitivement."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
