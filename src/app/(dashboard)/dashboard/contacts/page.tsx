import { Plus, Upload } from "lucide-react";

export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerez vos listes de contacts et segments
          </p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 border border-zinc-800 hover:border-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm transition-colors">
            <Upload className="h-4 w-4" />
            Importer CSV
          </button>
          <button className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" />
            Ajouter un contact
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total contacts", value: "0" },
          { label: "Abonnes", value: "0" },
          { label: "Desabonnes", value: "0" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50"
          >
            <div className="text-sm text-zinc-400">{stat.label}</div>
            <div className="text-xl font-semibold font-mono mt-1">
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
        <div className="text-zinc-500 text-sm">
          <p>Aucun contact pour le moment.</p>
          <p className="mt-2">Importez un fichier CSV ou ajoutez des contacts manuellement.</p>
        </div>
      </div>
    </div>
  );
}
