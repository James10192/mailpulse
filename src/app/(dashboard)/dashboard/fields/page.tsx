import { Plus, FormInput } from "lucide-react";

export default function FieldsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Champs personnalises</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Stockez des informations supplementaires sur vos contacts
          </p>
        </div>
        <button
          disabled
          className="inline-flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          Creer un champ
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
        <div className="p-12 text-center">
          <FormInput className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm mb-2">Les champs personnalises seront bientot disponibles.</p>
          <p className="text-zinc-400 text-xs">
            Les champs personnalises vous permettront de stocker des donnees supplementaires sur chaque contact,
            comme le nom de l&apos;entreprise, la ville ou toute autre information utile.
          </p>
        </div>
      </div>
    </div>
  );
}
