import { Building2, Check, Crown, Sparkles } from "lucide-react";

import { ContactButton } from "@/components/dashboard/contact-dialog";
import { UsageBar } from "@/components/dashboard/feature-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_LIMITS, getOrgUsage, type PlanTier } from "@/lib/plans";
import { prisma } from "@/lib/prisma";
import { SettingsPageFrame } from "../settings-page-frame";

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
    price: "Gratuit",
    icon: Sparkles,
    features: [
      "1 000 contacts",
      "5 000 emails/mois",
      "3 campagnes actives",
      "1 automation",
      "Éditeur email de base",
      "Analytics essentiels",
    ],
  },
  {
    tier: "PRO" as PlanTier,
    name: "Pro",
    price: "15 000 FCFA/mois",
    icon: Crown,
    features: [
      "25 000 contacts",
      "Emails illimités",
      "Campagnes illimitées",
      "Automations illimitées",
      "Domaines personnalisés",
      "Accès API et webhooks",
      "WhatsApp illimité",
    ],
  },
  {
    tier: "ENTERPRISE" as PlanTier,
    name: "Enterprise",
    price: "Sur mesure",
    icon: Building2,
    features: [
      "Tout le plan Pro",
      "Contacts illimités",
      "IP dédiée",
      "SSO / SAML",
      "Support prioritaire",
      "SLA garanti",
    ],
  },
];

export default async function BillingPage() {
  const data = await getBillingData();
  if (!data) return <div>Organisation non trouvée</div>;

  const { org, usage } = data;
  const currentPlan = org.plan as PlanTier;
  const limits = PLAN_LIMITS[currentPlan];

  return (
    <SettingsPageFrame section="billing">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Plan actuel</CardTitle>
            <CardDescription className="mt-1">
              {limits.priceFCFA === 0
                ? "Gratuit"
                : limits.priceFCFA === -1
                  ? "Tarif personnalisé"
                  : `${limits.priceFCFA.toLocaleString("fr-FR")} FCFA/mois`}
            </CardDescription>
          </div>
          <Badge variant="default" className="uppercase">
            {limits.label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label="Contacts" current={usage.contactCount} limit={limits.contacts} />
          <UsageBar label="Emails ce mois" current={org.emailsSentThisMonth} limit={limits.emailsPerMonth} />
          <UsageBar label="Campagnes actives" current={usage.activeCampaigns} limit={limits.activeCampaigns} />
          <UsageBar label="Automations" current={usage.automationCount} limit={limits.automations} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Comparer les plans
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.tier === currentPlan;
            const Icon = plan.icon;
            return (
              <Card
                key={plan.tier}
                className={isCurrent ? "border-orange-500/50 bg-orange-500/5" : undefined}
              >
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Icon className={isCurrent ? "h-5 w-5 text-orange-500" : "h-5 w-5 text-zinc-400"} />
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <div className="pt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {plan.price}
                  </div>
                </CardHeader>
                <CardContent className="flex h-full flex-col">
                  <ul className="flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled>
                        Plan actuel
                      </Button>
                    ) : plan.tier === "ENTERPRISE" ? (
                      <ContactButton className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-500">
                        Nous contacter
                      </ContactButton>
                    ) : (
                      <Button className="w-full">Upgrader</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Le paiement en FCFA via Mobile Money, Orange Money et Wave sera bientôt disponible via CinetPay.
          </p>
        </CardContent>
      </Card>
    </SettingsPageFrame>
  );
}
