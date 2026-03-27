import { Plus } from "lucide-react";

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Creez et gerez vos modeles d&apos;email
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" />
          Nouveau template
        </button>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Starter templates */}
        {["Bienvenue", "Newsletter", "Promotion"].map((name) => (
          <div
            key={name}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden group cursor-pointer hover:border-zinc-700 transition-colors"
          >
            <div className="h-40 bg-zinc-800/50 flex items-center justify-center">
              <span className="text-sm text-zinc-500">Apercu</span>
            </div>
            <div className="p-4">
              <h3 className="font-medium text-sm">{name}</h3>
              <p className="text-xs text-zinc-500 mt-1">Template par defaut</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
