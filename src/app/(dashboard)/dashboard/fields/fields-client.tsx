"use client";

import { useState, useActionState } from "react";
import { Plus, FormInput, Trash2, X, Info } from "lucide-react";
import { createField, deleteField } from "./actions";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import type { ActionState } from "@/types/action-state";

interface FieldData {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  createdAt: string;
}

const FIELD_TYPES = [
  { value: "text", label: "Texte" },
  { value: "number", label: "Nombre" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
  { value: "date", label: "Date" },
  { value: "select", label: "Liste" },
  { value: "boolean", label: "Oui/Non" },
];

export function FieldsClient({ fields }: { fields: FieldData[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(
    async (prev, formData) => {
      const result = await createField(prev, formData);
      if (result?.success) setModalOpen(false);
      return result;
    },
    null
  );

  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeleting(id);
    await deleteField(id);
    setDeleting(null);
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
              Champs personnalises
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Stockez des informations supplementaires sur vos contacts
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Creer un champ
          </button>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
          <Info className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-300/80">
            Les champs personnalises stockent des donnees supplementaires sur vos contacts (entreprise, ville, etc.). Utilisez-les dans vos campagnes avec {"{{nom_du_champ}}"}.
          </p>
        </div>

        {fields.length > 0 ? (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Label</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Nom (variable)</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Obligatoire</th>
                  <th className="text-right text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {fields.map((field) => (
                  <tr key={field.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      <div className="flex items-center gap-2">
                        <FormInput className="h-4 w-4 text-zinc-400" />
                        {field.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-zinc-500">
                      {`{{${field.name}}}`}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                        {FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {field.required ? "Oui" : "Non"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setConfirmDeleteId(field.id)}
                        disabled={deleting === field.id}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
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
            <FormInput className="h-8 w-8 text-zinc-400 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">
              Aucun champ personnalise. Creez des champs pour enrichir vos contacts.
            </p>
          </div>
        )}
      </div>

      {/* Create modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Nouveau champ
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <div>
                <label htmlFor="field-label" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Label (affiche) *
                </label>
                <input
                  id="field-label"
                  name="label"
                  type="text"
                  required
                  placeholder="Nom de l'entreprise"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
              </div>
              <div>
                <label htmlFor="field-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Nom technique (variable) *
                </label>
                <input
                  id="field-name"
                  name="name"
                  type="text"
                  required
                  placeholder="company_name"
                  pattern="[a-zA-Z_][a-zA-Z0-9_]*"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                />
                <p className="text-xs text-zinc-500 mt-1">Utilisable dans les emails : {"{{company_name}}"}</p>
              </div>
              <div>
                <label htmlFor="field-type" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Type
                </label>
                <select
                  id="field-type"
                  name="type"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-zinc-900 dark:text-zinc-100 cursor-pointer"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input id="field-required" name="required" type="checkbox" value="on" className="rounded border-zinc-300 dark:border-zinc-600" />
                <label htmlFor="field-required" className="text-sm text-zinc-700 dark:text-zinc-300">Obligatoire</label>
              </div>

              {state?.error && <p className="text-sm text-red-500">{state.error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer">
                  Annuler
                </button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50">
                  {isPending ? "Creation..." : "Creer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Supprimer ce champ ?"
        message="Les donnees associees a ce champ sur vos contacts seront perdues."
        confirmLabel="Supprimer"
        destructive
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </>
  );
}
