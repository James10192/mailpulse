"use client";

import { useActionState, useState, useEffect } from "react";
import { Plus, Filter, Trash2, X } from "lucide-react";
import { createSegment, deleteSegment } from "./actions";
import type { ActionState } from "@/types/action-state";

type SegmentData = {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
};

export function SegmentsClient({ segments }: { segments: SegmentData[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<
    ActionState,
    FormData
  >(createSegment, null);

  useEffect(() => {
    if (state?.success) setOpen(false);
  }, [state]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Segments
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Creez des segments dynamiques pour cibler vos contacts
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Creer un segment
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
        {segments.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Nom du segment
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Description
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Contacts
                </th>
                <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Date de creation
                </th>
                <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {segments.map((segment) => (
                <SegmentRow key={segment.id} segment={segment} />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <Filter className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm mb-2">
              Aucun segment pour le moment.
            </p>
            <p className="text-zinc-400 text-xs">
              Creez un segment dynamique pour regrouper automatiquement vos
              contacts selon des criteres.
            </p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Nouveau segment
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form action={formAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom
                </label>
                <input
                  name="name"
                  required
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="ex: Clients actifs, Prospects..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  placeholder="Description optionnelle..."
                />
              </div>
              {state?.error && (
                <p className="text-sm text-red-500">{state.error}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 text-sm rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-medium disabled:opacity-50 cursor-pointer"
                >
                  {pending ? "Creation..." : "Creer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentRow({ segment }: { segment: SegmentData }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await deleteSegment(segment.id);
    setDeleting(false);
  }

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(segment.createdAt));

  return (
    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {segment.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs truncate">
        {segment.description || "\u2014"}
      </td>
      <td className="px-4 py-3 text-sm font-mono text-zinc-500">
        {segment.contactCount}
      </td>
      <td className="px-4 py-3 text-sm text-zinc-500">{formattedDate}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-400 disabled:opacity-50 cursor-pointer"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {deleting ? "..." : "Supprimer"}
        </button>
      </td>
    </tr>
  );
}
