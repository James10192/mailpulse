import { Building2, Check, Crown, Sparkles } from "lucide-react";
import { Suspense } from "react";

import { ContactButton } from "@/components/dashboard/contact-dialog";
import { PaystackReturnVerifier, PaystackUpgradeButton } from "@/components/dashboard/paystack-upgrade-button";
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

  const [usage, payments] = await Promise.all([
    getOrgUsage(org.id),
    prisma.billingPayment.findMany({
      where: { organizationId: org.id },
      select: {
        id: true,
        reference: true,
        plan: true,
        amount: true,
        currency: true,
        status: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return { org, usage, payments };
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
] as const;

export default async function BillingPage() {
  const data = await getBillingData();
  if (!data) {
    return (
      <SettingsPageFrame section="billing">
        <Card className="border-dashed">
          <CardContent className="p-6">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Organisation non trouvée.</p>
          </CardContent>
        </Card>
      </SettingsPageFrame>
    );
  }

  const { org, usage, payments } = data;
  const currentPlan = org.plan as PlanTier;
  const limits = PLAN_LIMITS[currentPlan];
  const price = formatPlanPrice(limits.priceFCFA);

  return (
    <SettingsPageFrame section="billing">
      <Suspense fallback={null}>
        <PaystackReturnVerifier />
      </Suspense>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-balance">Plan actuel</CardTitle>
                <CardDescription className="text-pretty">
                  {org.name} utilise le plan {limits.label}.
                </CardDescription>
              </div>
              <Badge variant="default" className="uppercase">
                {limits.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-zinc-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:bg-zinc-900">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Montant</p>
                <p className="text-2xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{price}</p>
              </div>
              {currentPlan === "FREE" ? (
                <div className="w-full sm:w-56">
                  <PaystackUpgradeButton />
                </div>
              ) : currentPlan === "ENTERPRISE" ? (
                <ContactButton className="inline-flex min-h-10 items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-[scale,background-color] hover:bg-orange-500 active:scale-[0.98]">
                  Contacter le support
                </ContactButton>
              ) : (
                <Button variant="outline" className="min-h-10" disabled>
                  Plan actif
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <UsageTile label="Contacts" current={usage.contactCount} limit={limits.contacts} />
              <UsageTile label="Emails ce mois" current={org.emailsSentThisMonth} limit={limits.emailsPerMonth} />
              <UsageTile label="Campagnes actives" current={usage.activeCampaigns} limit={limits.activeCampaigns} />
              <UsageTile label="Automations" current={usage.automationCount} limit={limits.automations} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paiements récents</CardTitle>
            <CardDescription>Suivi des dernières tentatives Paystack.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {payments.length ? (
              payments.map((payment) => (
                <div key={payment.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    <p className="truncate font-mono text-[11px] text-zinc-500">{payment.reference}</p>
                    <p className="mt-1 text-xs text-zinc-500">{formatDate(payment.paidAt ?? payment.createdAt)}</p>
                  </div>
                  <Badge variant={payment.status === "SUCCESS" ? "success" : payment.status === "PENDING" ? "warning" : "destructive"}>
                    {paymentStatusLabel(payment.status)}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-zinc-500 dark:text-zinc-400">
                Aucun paiement enregistré pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Comparer les plans</h2>
          <p className="mt-1 text-pretty text-sm text-zinc-500 dark:text-zinc-400">
            Choisissez le niveau adapté à votre volume d&apos;envoi et à vos besoins d&apos;intégration.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = plan.tier === currentPlan;
            const Icon = plan.icon;

            return (
              <Card key={plan.tier} className={isCurrent ? "border-orange-500/50 bg-orange-500/5" : undefined}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className={isCurrent ? "size-5 text-orange-500" : "size-5 text-zinc-400"} />
                      <CardTitle>{plan.name}</CardTitle>
                    </div>
                    {isCurrent ? <Badge>Actuel</Badge> : null}
                  </div>
                  <div className="pt-2 text-xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{plan.price}</div>
                </CardHeader>
                <CardContent className="flex h-full flex-col">
                  <ul className="flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
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
                      <ContactButton className="inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-[scale,background-color] hover:bg-orange-500 active:scale-[0.98]">
                        Nous contacter
                      </ContactButton>
                    ) : (
                      <PaystackUpgradeButton />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </SettingsPageFrame>
  );
}

function UsageTile({ label, current, limit }: { label: string; current: number; limit: number }) {
  const unlimited = limit === -1;
  const percent = unlimited ? 0 : Math.min(100, Math.round((current / Math.max(limit, 1)) * 100));

  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{label}</p>
        <p className="text-xs tabular-nums text-zinc-500">
          {formatNumber(current)} / {unlimited ? "∞" : formatNumber(limit)}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full rounded-full bg-orange-500" style={{ width: unlimited ? "100%" : `${percent}%` }} />
      </div>
    </div>
  );
}

function formatPlanPrice(priceFCFA: number) {
  if (priceFCFA === 0) return "Gratuit";
  if (priceFCFA === -1) return "Tarif personnalisé";
  return `${formatNumber(priceFCFA)} FCFA/mois`;
}

function formatCurrency(amount: number, currency: string) {
  return `${formatNumber(amount)} ${currency}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("fr-FR").format(value);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function paymentStatusLabel(status: string) {
  if (status === "SUCCESS") return "Payé";
  if (status === "PENDING") return "En attente";
  if (status === "ABANDONED") return "Abandonné";
  return "Échoué";
}
