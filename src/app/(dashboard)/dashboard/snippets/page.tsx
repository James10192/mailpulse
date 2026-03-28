import { Plus, Code } from "lucide-react";

export default function SnippetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Email Snippets</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Creez des blocs de contenu reutilisables pour vos emails
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <Plus className="h-4 w-4" />
          Nouveau snippet
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
        <Code className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-500 text-sm mb-4">Aucun snippet pour le moment.</p>
        <button className="text-orange-500 hover:text-orange-400 text-sm font-medium cursor-pointer">
          Creer votre premier snippet
        </button>
      </div>
    </div>
  );
}
