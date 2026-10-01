import { KeyRound, MessageSquare, Send, Webhook } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";
import { canManageOrganization } from "@/lib/access/roles";
import { loadPlatformOverview } from "@/lib/platform/overview";
import { readOverviewPeriod } from "@/lib/platform/overview-metrics";
import { PlanReadOnlyNotice } from "@/components/dashboard/plan-read-only-notice";
import { serializeTemplate } from "@/lib/mailpulse/serializers";
import { countByOutcome, normalizeMessageFilters } from "./message-filters";
import { OverviewPanel } from "./overview-panel";
import { loadIntegrationsTab, loadMessagesTab, loadWebhooksTab, readWebhookFilters } from "./platform-data";
import { LiveRefresh } from "./live-refresh";
import { WebhooksPanel } from "./webhooks-panel";
import { DeliveryByChannelChart, MessageVolumeChart } from "./platform-charts";
import { ApiKeysPanel } from "./platform-client";
import { PlatformMessagesPanel } from "./platform-messages-panel";
import { PlatformTabs, type PlatformTab } from "./platform-tabs";
import { VerificationsPanel } from "./verifications-panel";

export const dynamic = "force-dynamic";

const TABS: PlatformTab[] = ["overview", "messages", "webhooks", "verifications", "integrations"];

function statusVariant(status: string) {
  if (["DELIVERED", "SENT", "READ", "APPROVED"].includes(status)) return "success" as const;
  if (["FAILED", "REJECTED", "TEMPLATE_REQUIRED"].includes(status)) return "destructive" as const;
  if (["RETRYING", "PENDING_REVIEW", "QUEUED"].includes(status)) return "warning" as const;
  return "secondary" as const;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof MessageSquare }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border bg-card px-4 py-3 sm:px-5">
      <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate font-mono text-base font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function originOf(url: string) {
  try {
    return `${new URL(url).origin}/…`;
  } catch {
    return "Adresse masquée";
  }
}

export default async function PlatformPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { org, memberRole, isPlatformAdmin } = await getCurrentUserAndOrg();
  const canUseApi = org ? canAccessFeature(org.plan as PlanTier, "api_access") : false;
  // Keys decide which number speaks for the organization, and recipients are
  // personal data: both are for managers only.
  const isManager = canManageOrganization({ memberRole, isPlatformAdmin });
  const canManage = canUseApi && isManager;
  const orgId = org?.id ?? "";
  const params = await searchParams;
  // An older link to the registry (filters, no tab) keeps opening the registry.
  const registryParams = ["message", "outcome", "status", "query", "channel", "origin", "key", "application", "sender", "page"];
  const webhookParams = ["endpoint", "deliveryStatus"];
  const tab = TABS.find((value) => value === params.tab)
    ?? (webhookParams.some((name) => params[name]) ? "webhooks" : registryParams.some((name) => params[name]) ? "messages" : "overview");
  const now = new Date();

  let content: React.ReactNode = null;
  if (tab === "overview") {
    content = <OverviewPanel overview={await loadPlatformOverview(orgId, readOverviewPeriod(params.period), now)} />;
  } else if (tab === "messages") {
    const filters = normalizeMessageFilters(params);
    const data = await loadMessagesTab(orgId, filters, { now, canSeePersonalData: isManager, messageId: typeof params.message === "string" ? params.message : null });
    content = (
      <>
        <PlatformMessagesPanel
          messages={data.messages}
          linkedMessage={data.linkedMessage}
          total={data.total}
          pageCount={data.pageCount}
          filters={filters}
          outcomeCounts={countByOutcome(data.outcomeRows)}
          keyOptions={data.keyOptions}
          applicationOptions={data.applicationOptions}
          senderOptions={data.senderOptions}
          personalDataMasked={!isManager}
        />
        <section className="space-y-3" aria-labelledby="platform-analysis-title">
          <div>
            <h2 id="platform-analysis-title" className="text-base font-semibold">Tendances</h2>
            <p className="mt-1 text-sm text-muted-foreground">Toutes clés et toutes périodes confondues.</p>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card><CardHeader><CardTitle className="text-base">Délivrance par canal</CardTitle><CardDescription>Messages directs et API, hors campagnes.</CardDescription></CardHeader><CardContent><DeliveryByChannelChart data={data.deliveryData} /></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-base">Volume récent</CardTitle><CardDescription>Quatorze derniers jours.</CardDescription></CardHeader><CardContent><MessageVolumeChart data={data.volume} /></CardContent></Card>
          </div>
        </section>
      </>
    );
  } else if (tab === "webhooks") {
    const webhookFilters = readWebhookFilters(params);
    const data = await loadWebhooksTab(orgId, webhookFilters, now);
    // A receiver's URL may carry its own token: members who do not manage see the domain only.
    const visible = isManager ? data : { ...data, endpoints: data.endpoints.map((endpoint) => ({ ...endpoint, url: originOf(endpoint.url) })) };
    content = (
      <>
        {!canAccessFeature((org?.plan ?? "FREE") as PlanTier, "webhooks") ? <PlanReadOnlyNotice feature="Les webhooks" /> : null}
        <WebhooksPanel
          data={visible}
          filters={webhookFilters}
          canManage={isManager && canAccessFeature((org?.plan ?? "FREE") as PlanTier, "webhooks")}
          disabledReason={isManager ? "Disponible avec le plan Pro" : "Réservé aux propriétaires et administrateurs"}
        />
      </>
    );
  } else if (tab === "verifications") {
    content = <VerificationsPanel organizationId={orgId} />;
  } else {
    const data = await loadIntegrationsTab(orgId, now);
    content = (
      <>
        {!canUseApi ? <PlanReadOnlyNotice feature="Les clés API, webhooks et intégrations" /> : null}
        <section className="grid gap-4 lg:grid-cols-3">
          <Metric label="Clés actives" value={data.activeKeys.toLocaleString("fr-FR")} icon={KeyRound} />
          <Metric label="Webhooks actifs" value={data.activeWebhooks.toLocaleString("fr-FR")} icon={Webhook} />
          <Metric label="Modèles" value={data.templates.length.toLocaleString("fr-FR")} icon={MessageSquare} />
        </section>
        <ApiKeysPanel
          canManage={canManage}
          disabledReason={canUseApi ? "Réservé aux propriétaires et administrateurs" : "Disponible avec le plan Pro"}
          apiKeys={data.apiKeys}
          emailSenders={data.senderOptions}
          applications={data.applicationOptions}
        />
        <div className="grid gap-4">
          <Card className="overflow-hidden"><CardHeader><CardTitle>Modèles</CardTitle><CardDescription>Références de modèles disponibles pour les intégrations.</CardDescription></CardHeader><CardContent className="px-0 pb-0"><div className="overflow-x-auto"><Table className="min-w-[520px]"><TableHeader><TableRow><TableHead>Clé</TableHead><TableHead>Canal</TableHead><TableHead>Locale</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader><TableBody>{data.templates.length === 0 ? <TableRow><TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">Aucun modèle d’intégration.</TableCell></TableRow> : data.templates.map((template) => { const item = serializeTemplate(template); return <TableRow key={item.id}><TableCell className="max-w-44 truncate font-mono text-xs">{item.template_key}</TableCell><TableCell>{item.channel}</TableCell><TableCell className="font-mono text-xs">{item.locale}</TableCell><TableCell><Badge variant={statusVariant(item.status.toUpperCase())}>{item.status}</Badge></TableCell></TableRow>; })}</TableBody></Table></div></CardContent></Card>
        </div>
      </>
    );
  }

  return (
    <div className="page-stack app-shell-safe">
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Plateforme" }]} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-2xl font-semibold text-foreground">Plateforme</h1>
          <p className="mt-1 max-w-2xl text-pretty text-sm text-muted-foreground">Suivez la santé de vos envois, chaque message direct ou API, et les clés des applications qui les envoient.</p>
        </div>
        {canUseApi ? (
          <Button asChild className="min-h-11 shrink-0"><Link href="/dashboard/messaging"><Send className="size-4" />Envoyer un message</Link></Button>
        ) : (
          <Button className="min-h-11 shrink-0" disabled title="Disponible avec le plan Pro"><Send className="size-4" />Envoyer un message</Button>
        )}
      </header>

      {tab === "overview" || tab === "messages" || tab === "webhooks" ? <div className="-mb-2 flex justify-end"><LiveRefresh /></div> : null}
      <PlatformTabs tab={tab}>{content}</PlatformTabs>
    </div>
  );
}
