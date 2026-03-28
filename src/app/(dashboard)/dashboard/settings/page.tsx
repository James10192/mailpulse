import Link from "next/link";
import { CreditCard, ArrowRight } from "lucide-react";
import { ProfileSection } from "@/components/dashboard/profile-section";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

export default function SettingsPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Parametres" }]} />
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Parametres</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Configuration de votre organisation et domaines d&apos;envoi
        </p>
      </div>

      {/* Billing link */}
      <Link
        href="/dashboard/settings/billing"
        className="flex items-center justify-between p-5 rounded-xl border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-3">
          <CreditCard className="h-5 w-5 text-orange-400" />
          <div>
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Abonnement & Facturation
            </div>
            <div className="text-xs text-zinc-500 mt-0.5">
              Gerez votre plan, suivez votre utilisation
            </div>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-orange-400 group-hover:translate-x-1 transition-transform" />
      </Link>

      <ProfileSection />

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Organisation</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1.5">
              Nom de l&apos;organisation
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              placeholder="Mon entreprise"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-500 dark:text-zinc-400 mb-1.5">
              Email par defaut (From)
            </label>
            <input
              type="email"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              placeholder="newsletter@mondomaine.com"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Domaines d&apos;envoi</h2>
          <button className="text-sm text-orange-500 hover:text-orange-400">
            Ajouter un domaine
          </button>
        </div>
        <div className="text-sm text-zinc-500">
          Configurez SPF, DKIM et DMARC pour vos domaines d&apos;envoi afin
          d&apos;ameliorer la delivrabilite.
        </div>
        <div className="p-4 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-sm text-zinc-500">
          Aucun domaine configure
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100">Cles API</h2>
        <div className="text-sm text-zinc-500">
          Gerez vos cles API pour l&apos;integration avec vos applications.
        </div>
        <button className="text-sm bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg transition-colors">
          Generer une cle API
        </button>
      </section>
    </div>
  );
}
