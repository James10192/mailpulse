import { Plus, AtSign, CheckCircle } from "lucide-react";

export default function SendersPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Expediteurs</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gerez les adresses email utilisees pour envoyer vos campagnes
          </p>
        </div>
        <button className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
          <Plus className="h-4 w-4" />
          Creer un expediteur
        </button>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Nom</th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Email</th>
              <th className="text-left text-xs font-medium text-zinc-500 uppercase tracking-wider px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
              <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">MailPulse (defaut)</td>
              <td className="px-4 py-3 text-sm font-mono text-zinc-500">noreply@yourdomain.com</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  Actif
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
