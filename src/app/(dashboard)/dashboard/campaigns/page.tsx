import Link from "next/link";
import { Plus } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Campagnes</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gerez et suivez vos campagnes email
          </p>
        </div>
        <Link
          href="/dashboard/campaigns/new"
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle campagne
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["Toutes", "Brouillons", "Planifiees", "Envoyees"].map((filter) => (
          <button
            key={filter}
            className="px-3 py-1.5 text-xs rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:border-zinc-700 transition-colors first:bg-zinc-800 first:text-zinc-100"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
        <div className="text-zinc-500 text-sm">
          <p className="mb-4">Aucune campagne creee pour le moment.</p>
          <Link
            href="/dashboard/campaigns/new"
            className="text-orange-500 hover:text-orange-400"
          >
            Creer votre premiere campagne
          </Link>
        </div>
      </div>
    </div>
  );
}
