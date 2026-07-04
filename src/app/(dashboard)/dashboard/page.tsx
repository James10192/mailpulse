import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  KeyRound,
  Send,
  Users,
  Zap,
} from "lucide-react";

import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { DateRangeButton } from "@/components/dashboard/date-range-button";
import { UpgradeBanner, UsageBar } from "@/components/dashboard/feature-gate";
import { LiveActivityFeed } from "@/components/dashboard/live-activity-feed";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getOverLimitResources } from "@/lib/plan-enforcement";
import { PLAN_LIMITS, checkEmailLimit, getOrgUsage, type PlanTier } from "@/lib/plans";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import {
  CHANNEL_LABELS,
  STATUS_LABELS,
  buildApiStatusData,
  buildCampaignChannelData,
  buildVolumeData,
  formatNumber,
  formatRate,
  getCampaignTotals,
  getDashboardData,
  getMessageTotals,
  getWebhookTotals,
  percent,
} from "./dashboard-data";
import { ApiStatusChart, CampaignChannelChart, MessageVolumeChart } from "./dashboard-charts";

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="mt-2 font-mono text-2xl">{value}</CardTitle>
        </div>
        <Icon className="h-5 w-5 shrink-0 text-zinc-400" />
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
      </CardContent>
    </Card>
  );
}

function QualityMetric({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
        </div>
        <Icon className="h-5 w-5 shrink-0 text-zinc-400" />
      </div>
      <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
    </div>
  );
}

function ChannelBadge({ channel }: { channel: keyof typeof CHANNEL_LABELS }) {
  const variant = channel === "WHATSAPP" ? "success" : channel === "SMS" ? "secondary" : "default";
  return <Badge variant={variant}>{CHANNEL_LABELS[channel]}</Badge>;
}

function StatusBadge({ status }: { status: keyof typeof STATUS_LABELS }) {
  const variant = status === "SENT" ? "success" : status === "SENDING" || status === "SCHEDULED" ? "warning" : "outline";
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

export default async function DashboardPage() {
  const { org } = await getCurrentUserAndOrg();
  const orgId = org?.id ?? "";
  const plan = (org?.plan ?? "FREE") as PlanTier;
  const limits = PLAN_LIMITS[plan];
  const isFreePlan = plan === "FREE";
  const data = await getDashboardData(orgId);

  const campaignTotals = getCampaignTotals(data.campaigns);
  const messageTotals = getMessageTotals(data.messages);
  const webhookTotals = getWebhookTotals(data.webhookDeliveries);
  const activeApiKeys = data.apiKeys.filter((key) => !key.revokedAt).length;
  const lastApiUse = data.apiKeys.map((key) => key.lastUsedAt?.getTime() ?? 0).sort((a, b) => b - a)[0];

  let usage: { contactCount: number; activeCampaigns: number; automationCount: number } | null = null;
  let emailUsage: { sent: number; limit: number } | null = null;
  let overLimitResources: { resource: string; current: number; limit: number; label: string }[] = [];

  if (isFreePlan && org) {
    const [orgUsage, emailCheck, overLimit] = await Promise.all([
      getOrgUsage(org.id),
      checkEmailLimit(org.id, plan),
      getOverLimitResources(org.id, plan),
    ]);
    usage = orgUsage;
    emailUsage = { sent: emailCheck.sent, limit: emailCheck.limit };
    overLimitResources = overLimit;
  }

  const isApproachingLimit =
    isFreePlan &&
    usage &&
    ((usage.contactCount / limits.contacts >= 0.8) ||
      (usage.activeCampaigns / limits.activeCampaigns >= 0.8) ||
      (usage.automationCount / limits.automations >= 0.8) ||
      (emailUsage && emailUsage.limit > 0 && emailUsage.sent / emailUsage.limit >= 0.8));
  const hasOverLimitResources = overLimitResources.length > 0;

  return (
    <div className="page-stack app-shell-safe">
      <Breadcrumb items={[{ label: "" }]} />
      <OnboardingChecklist />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Tableau de bord</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Vue globale des campagnes, messages API, canaux, webhooks et limites du plan.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeButton />
          <Button asChild>
            <Link href="/dashboard/campaigns/new">
              <Send className="h-4 w-4" />
              Nouvelle campagne
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Messages 14 jours"
          value={formatNumber(messageTotals.total)}
          description={`${formatNumber(messageTotals.email)} email · ${formatNumber(messageTotals.whatsapp)} WhatsApp · ${formatNumber(messageTotals.api)} via API`}
          icon={Activity}
        />
        <MetricCard
          title="Campagnes"
          value={formatNumber(campaignTotals.total)}
          description={`${formatNumber(campaignTotals.email)} email · ${formatNumber(campaignTotals.whatsapp)} WhatsApp · ${formatNumber(campaignTotals.active)} actives`}
          icon={BarChart3}
        />
        <MetricCard
          title="Contacts"
          value={formatNumber(data.contactCount)}
          description={`${formatNumber(data.subscribedContacts)} abonnés · ${formatNumber(data.openConversations)} conversations ouvertes`}
          icon={Users}
        />
        <MetricCard
          title="API publique"
          value={formatNumber(messageTotals.api)}
          description={`${formatNumber(activeApiKeys)} clés actives · dernier usage ${
            lastApiUse ? new Date(lastApiUse).toLocaleDateString("fr-FR") : "jamais"
          }`}
          icon={KeyRound}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Volume multicanal</CardTitle>
            <CardDescription>Email, WhatsApp et appels API sur les 14 derniers jours.</CardDescription>
          </CardHeader>
          <CardContent>
            <MessageVolumeChart data={buildVolumeData(data.messages, data.rangeStart)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campagnes par canal</CardTitle>
            <CardDescription>Répartition réelle des campagnes email, WhatsApp et SMS.</CardDescription>
          </CardHeader>
          <CardContent>
            {buildCampaignChannelData(data.campaigns).length > 0 ? (
              <CampaignChannelChart data={buildCampaignChannelData(data.campaigns)} />
            ) : (
              <div className="flex h-[220px] items-center justify-center text-center text-sm text-zinc-500">
                Aucune campagne créée pour le moment.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Messages API par statut</CardTitle>
            <CardDescription>Envoyés, en attente et échecs par canal sur 14 jours.</CardDescription>
          </CardHeader>
          <CardContent>
            <ApiStatusChart data={buildApiStatusData(data.messages)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualité d’envoi</CardTitle>
            <CardDescription>Lecture rapide de la délivrabilité, des webhooks et des erreurs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <QualityMetric
                title="Délivrabilité"
                value={formatRate(percent(messageTotals.delivered, messageTotals.total))}
                description={`${formatNumber(messageTotals.delivered)} messages livrés ou lus`}
                icon={CheckCircle2}
              />
              <QualityMetric
                title="Échecs"
                value={formatRate(percent(messageTotals.failed, messageTotals.total))}
                description={`${formatNumber(messageTotals.failed)} messages échoués ou bloqués`}
                icon={Zap}
              />
            </div>
            <Separator />
            <div className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-zinc-500">Webhooks livrés</p>
                <p className="mt-1 font-mono text-lg font-semibold">{formatNumber(webhookTotals.delivered)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Webhooks en attente</p>
                <p className="mt-1 font-mono text-lg font-semibold">{formatNumber(webhookTotals.pending)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Webhooks KO</p>
                <p className="mt-1 font-mono text-lg font-semibold">{formatNumber(webhookTotals.failed)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.85fr)]">
        <RecentCampaignsTable campaigns={data.recentCampaigns} />
        <LiveActivityFeed organizationId={orgId} />
      </div>

      {isFreePlan && usage && emailUsage && (
        <Card>
          <CardHeader>
            <CardTitle>Utilisation du plan {limits.label}</CardTitle>
            <CardDescription>Suivi des limites pour éviter les blocages en production.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <UsageBar label="Contacts" current={usage.contactCount} limit={limits.contacts} />
            <UsageBar label="Emails ce mois" current={emailUsage.sent} limit={emailUsage.limit} />
            <UsageBar label="Campagnes actives" current={usage.activeCampaigns} limit={limits.activeCampaigns} />
            <UsageBar label="Automations" current={usage.automationCount} limit={limits.automations} />
          </CardContent>
        </Card>
      )}

      {hasOverLimitResources && (
        <UpgradeBanner
          message={`Limites dépassées : ${overLimitResources
            .map((resource) => `${resource.label} (${resource.current}/${resource.limit})`)
            .join(", ")}`}
          details="Certaines ressources sont gelées ou ne peuvent plus être créées. Passez au Pro pour lever ces restrictions."
        />
      )}

      {!hasOverLimitResources && isApproachingLimit && (
        <UpgradeBanner message="Vous approchez des limites du plan Starter." />
      )}
    </div>
  );
}

function RecentCampaignsTable({ campaigns }: { campaigns: Awaited<ReturnType<typeof getDashboardData>>["recentCampaigns"] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Campagnes récentes</CardTitle>
          <CardDescription>Canal, statut et performance visibles sans ouvrir la fiche.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/campaigns">
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campagne</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Ouvertures</TableHead>
              <TableHead className="text-right">Clics</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                  Aucune campagne pour le moment.
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{campaign.name}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(campaign.createdAt).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <ChannelBadge channel={campaign.channel} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={campaign.status} />
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatRate((campaign.analytics?.openRate ?? 0) * 100)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatRate((campaign.analytics?.clickRate ?? 0) * 100)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
