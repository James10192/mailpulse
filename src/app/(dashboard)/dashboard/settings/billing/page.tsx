import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS, getOrgUsage, type PlanTier } from "@/lib/plans";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { UsageBar } from "@/components/dashboard/feature-gate";
import { Check, Sparkles, Crown, Building2 } from "lucide-react";

async function getBillingData() {
  const org = await prisma.organization.findFirst({
    select: { id: true, name: true, plan: true, emailsSentThisMonth: true },
  });
  if (!org) return null;

  const usage = await getOrgUsage(org.id);
  return { org, usage };
}

const plans = [
  {
    tier: "FREE" as PlanTier,
    name: "Starter",
    price: "0",
    icon: Sparkles,
    features: [
      "1 000 contacts",
      "5 000 emails/mois",
      "3 campagnes actives",
      "1 automation",
      "Editeur email de base",
      "Analytics essentiels",
    ],
  },
  {
    tier: "PRO" as PlanTier,
    name: "Pro",
    price: "15 000",
    icon: Crown,
    features: [
      "25 000 contacts",
      "Emails illimites",
      "Campagnes illimitees",
      "Automations illimitees",
      "A/B testing",
      "Domaines personnalises",
      "Acces API & Webhooks",
      "Analytics avances",
      "Snippets illimites",
    ],
  },
  {
    tier: "ENTERPRISE" as PlanTier,
    name: "Enterprise",
    price: "Sur mesure",
    icon: Building2,
    features: [
      "Tout le plan Pro",
      "Contacts illimites",
      "IP dediee",
      "SSO / SAML",
      "Support prioritaire",
      "SLA garanti",
    ],
  },
];

export default async function BillingPage() {
  const data = await getBillingData();
  if (!data) return <div>Organisation non trouvee</div>;

  const { org, usage } = data;
  const currentPlan = org.plan as PlanTier;
  const limits = PLAN_LIMITS[currentPlan];

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Parametres", href: "/dashboard/settings" },
          { label: "Abonnement" },
        ]}
      />

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Abonnement & Facturation
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Gerez votre plan et suivez votre utilisation
        </p>
      </div>

      {/* Current plan + usage */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">
                Plan actuel
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">
                {limits.label}
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-1">
              {limits.priceFCFA === 0
                ? "Gratuit"
                : limits.priceFCFA === -1
                  ? "Tarif personnalise"
                  : `${limits.priceFCFA.toLocaleString("fr-FR")} FCFA/mois`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <UsageBar
            label="Contacts"
            current={usage.contactCount}
            limit={limits.contacts}
          />
          <UsageBar
            label="Emails ce mois"
            current={org.emailsSentThisMonth}
            limit={limits.emailsPerMonth}
          />
          <UsageBar
            label="Campagnes actives"
            current={usage.activeCampaigns}
            limit={limits.activeCampaigns}
          />
          <UsageBar
            label="Automations"
            current={usage.automationCount}
            limit={limits.automations}
          />
        </div>
      </div>

      {/* Plans comparison */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Comparer les plans
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.tier === currentPlan;
            const Icon = plan.icon;
            return (
              <div
                key={plan.tier}
                className={`rounded-xl border p-5 transition-all ${
                  isCurrent
                    ? "border-orange-500/50 bg-orange-500/5"
                    : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50"
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon
                    className={`h-5 w-5 ${isCurrent ? "text-orange-500" : "text-zinc-400"}`}
                  />
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {plan.name}
                  </h3>
                </div>
                <div className="mb-4">
                  {plan.price === "Sur mesure" ? (
                    <span className="text-lg font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      Sur mesure
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {plan.price === "0" ? "Gratuit" : plan.price}
                      </span>
                      {plan.price !== "0" && (
                        <span className="text-xs text-zinc-500">FCFA/mois</span>
                      )}
                    </div>
                  )}
                </div>
                <ul className="space-y-2 mb-5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-zinc-400">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="text-center text-xs text-orange-400 font-medium py-2">
                    Plan actuel
                  </div>
                ) : (
                  <button className="w-full py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer bg-orange-600 hover:bg-orange-500 text-white">
                    {plan.price === "Sur mesure" ? "Nous contacter" : "Upgrader"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment info placeholder */}
      <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-6 text-center">
        <p className="text-sm text-zinc-500">
          Le paiement en FCFA via Mobile Money (MTN, Orange, Wave) sera bientot disponible via CinetPay.
        </p>
      </div>
    </div>
  );
}
