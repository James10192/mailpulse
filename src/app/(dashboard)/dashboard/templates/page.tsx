import { Plus } from "lucide-react";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Templates</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Creez et gerez vos modeles d&apos;email
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" />
          Nouveau template
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {["Bienvenue", "Newsletter", "Promotion"].map((name) => (
          <div
            key={name}
            className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden group cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <div className="h-40 bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center">
              <span className="text-sm text-zinc-400 dark:text-zinc-500">Apercu</span>
            </div>
            <div className="p-4">
              <h3 className="font-medium text-sm text-zinc-900 dark:text-zinc-100">{name}</h3>
              <p className="text-xs text-zinc-500 mt-1">Template par defaut</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
