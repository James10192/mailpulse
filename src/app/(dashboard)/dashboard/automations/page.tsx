import { Plus, Zap } from "lucide-react";

export default function AutomationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Automations</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Workflows automatises pour vos campagnes
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="h-4 w-4" />
          Nouvelle automation
        </button>
      </div>

      {/* Preset automations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            name: "Serie de bienvenue",
            desc: "Envoyez une sequence d'emails aux nouveaux abonnes",
            trigger: "Nouvel abonne",
          },
          {
            name: "Re-engagement",
            desc: "Ciblez les contacts inactifs depuis 30 jours",
            trigger: "Inactivite",
          },
          {
            name: "Anniversaire",
            desc: "Email automatique pour l'anniversaire du contact",
            trigger: "Date",
          },
        ].map((automation) => (
          <button
            key={automation.name}
            className="p-5 rounded-xl border border-dashed border-zinc-700 hover:border-orange-500/50 text-left transition-colors group"
          >
            <Zap className="h-5 w-5 text-zinc-500 group-hover:text-orange-500 mb-3 transition-colors" />
            <h3 className="font-medium text-sm">{automation.name}</h3>
            <p className="text-xs text-zinc-500 mt-1">{automation.desc}</p>
            <div className="mt-3 inline-block text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
              {automation.trigger}
            </div>
          </button>
        ))}
      </div>

      {/* Active automations */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
        <div className="text-zinc-500 text-sm">
          Aucune automation active. Choisissez un modele ci-dessus ou creez-en une personnalisee.
        </div>
      </div>
    </div>
  );
}
