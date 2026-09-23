import { KeyRound, MessageSquare, Send, Webhook } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";
import { PlanReadOnlyNotice } from "@/components/dashboard/plan-read-only-notice";
import { serializeMessage, serializeTemplate } from "@/lib/mailpulse/serializers";
import { buildMessageWhere, countByOutcome, normalizeMessageFilters } from "./message-filters";
import { DeliveryByChannelChart, MessageVolumeChart } from "./platform-charts";
import { ApiKeysPanel } from "./platform-client";
import { PlatformMessagesPanel, type ApiMessageDetail } from "./platform-messages-panel";
import { PlatformTabs } from "./platform-tabs";
import { VerificationsPanel } from "./verifications-panel";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const KEY_ACTIVITY_DAYS = 30;
const compactDateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });

function statusVariant(status: string) {
  if (["DELIVERED", "SENT", "READ", "APPROVED"].includes(status)) return "success" as const;
  if (["FAILED", "REJECTED", "TEMPLATE_REQUIRED"].includes(status)) return "destructive" as const;
  if (["RETRYING", "PENDING_REVIEW", "QUEUED"].includes(status)) return "warning" as const;
  return "secondary" as const;
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
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

export default async function PlatformPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { org } = await getCurrentUserAndOrg();
  const canManage = org ? canAccessFeature(org.plan as PlanTier, "api_access") : false;
  const orgId = org?.id ?? "";
  const params = await searchParams;
  const filters = normalizeMessageFilters(params);
  const tab = params.tab === "integrations" || params.tab === "verifications" ? params.tab : "messages";
  const now = new Date();
  const messageWhere = buildMessageWhere(orgId, filters, now);
  const outcomeWhere = buildMessageWhere(orgId, filters, now, { withStatus: false });
  const monitoringWhere = buildMessageWhere(orgId, { ...filters, query: "", channel: "", origin: "", outcome: "", status: "", key: "", period: "all", page: 1 }, now);
  const sinceFortnight = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  const sinceKeyActivity = new Date(now.getTime() - KEY_ACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const [
    apiKeys,
    keyActivity,
    messages,
    total,
    outcomeRows,
    templates,
    webhooks,
    channelCounts,
    recentMessages,
    emailSenders,
    verifiedDomains,
  ] = await Promise.all([
    prisma.integrationApiKey.findMany({ where: { organizationId: orgId, provider: "MAILPULSE" }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.communicationMessage.groupBy({ by: ["apiKeyId"], where: { organizationId: orgId, apiKeyId: { not: null }, createdAt: { gte: sinceKeyActivity } }, _count: { _all: true } }),
    prisma.communicationMessage.findMany({
      where: messageWhere,
      include: {
        contact: { select: { email: true, phone: true, firstName: true, lastName: true } },
        template: { select: { templateKey: true, name: true, providerTemplateId: true } },
        apiKey: { select: { id: true, name: true, environment: true, revokedAt: true } },
        webhookDeliveries: { orderBy: { createdAt: "desc" }, take: 5, include: { endpoint: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.communicationMessage.count({ where: messageWhere }),
    prisma.communicationMessage.groupBy({ by: ["status"], where: outcomeWhere, _count: { _all: true } }),
    prisma.communicationTemplate.findMany({ where: { organizationId: orgId }, orderBy: { updatedAt: "desc" }, take: 12 }),
    prisma.webhookEndpoint.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.communicationMessage.groupBy({ by: ["channel", "status"], where: monitoringWhere, _count: { _all: true } }),
    prisma.communicationMessage.findMany({ where: { ...monitoringWhere, createdAt: { gte: sinceFortnight } }, select: { createdAt: true } }),
    prisma.emailSender.findMany({ where: { organizationId: orgId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], select: { id: true, name: true, email: true, isDefault: true } }),
    prisma.sendingDomain.findMany({ where: { organizationId: orgId, verified: true, status: "verified" }, select: { domain: true } }),
  ]);
  // Same rule as the key actions: a sender is usable only on a verified domain.
  const verifiedDomainSet = new Set(verifiedDomains.map((item) => item.domain.toLowerCase()));
  const senderOptions = emailSenders.map((sender) => ({ ...sender, verified: verifiedDomainSet.has(sender.email.split("@")[1]?.toLowerCase() ?? "") }));

  const serializedMessages: ApiMessageDetail[] = messages.map((message) => ({
    ...serializeMessage(message),
    origin: message.origin === "API" ? "api" : message.origin === "PLATFORM" ? "platform" : "legacy",
    api_key: message.apiKey ? { id: message.apiKey.id, name: message.apiKey.name, environment: message.apiKey.environment, revoked: Boolean(message.apiKey.revokedAt) } : null,
    contact: message.contact ? { email: message.contact.email, phone: message.contact.phone, first_name: message.contact.firstName, last_name: message.contact.lastName } : null,
    template: message.template ? { key: message.template.templateKey, name: message.template.name, provider_template_id: message.template.providerTemplateId } : null,
    webhook_deliveries: message.webhookDeliveries.map((delivery) => ({ id: delivery.id, endpoint_name: delivery.endpoint.name, event_type: delivery.eventType, status: delivery.status, attempts: delivery.attempts, last_error: delivery.lastError, delivered_at: delivery.deliveredAt?.toISOString() ?? null })),
  }));

  const recentByKey = new Map(keyActivity.map((row) => [row.apiKeyId, row._count._all]));
  const keyOptions = apiKeys.map((key) => ({ id: key.id, name: key.name, revoked: Boolean(key.revokedAt) }));
  const deliveryData = ["EMAIL", "WHATSAPP", "SMS"].map((channel) => ({
    channel: channel === "WHATSAPP" ? "WhatsApp" : channel === "EMAIL" ? "Email" : "SMS",
    queued: channelCounts.filter((item) => item.channel === channel && ["QUEUED", "RETRYING"].includes(item.status)).reduce((sum, item) => sum + item._count._all, 0),
    delivered: channelCounts.filter((item) => item.channel === channel && ["DELIVERED", "READ", "SENT"].includes(item.status)).reduce((sum, item) => sum + item._count._all, 0),
    failed: channelCounts.filter((item) => item.channel === channel && ["FAILED", "TEMPLATE_REQUIRED"].includes(item.status)).reduce((sum, item) => sum + item._count._all, 0),
  }));
  const volumeByDay = new Map<string, number>();
  for (const message of recentMessages) volumeByDay.set(dateKey(message.createdAt), (volumeByDay.get(dateKey(message.createdAt)) ?? 0) + 1);
  const volumeData = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() - (13 - index));
    return { date: compactDateFormatter.format(date), messages: volumeByDay.get(dateKey(date)) ?? 0 };
  });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeKeys = apiKeys.filter((key) => !key.revokedAt).length;
  const activeWebhooks = webhooks.filter((webhook) => webhook.active).length;

  return (
    <div className="page-stack app-shell-safe">
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Plateforme" }]} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-2xl font-semibold text-foreground">Plateforme</h1>
          <p className="mt-1 max-w-2xl text-pretty text-sm text-muted-foreground">Suivez chaque message envoyé en direct ou par l&apos;API, et gérez les clés des applications qui les envoient.</p>
        </div>
        {canManage ? (
          <Button asChild className="min-h-11 shrink-0"><Link href="/dashboard/messaging"><Send className="size-4" />Envoyer un message</Link></Button>
        ) : (
          <Button className="min-h-11 shrink-0" disabled title="Disponible avec le plan Pro"><Send className="size-4" />Envoyer un message</Button>
        )}
      </header>

      <PlatformTabs
        tab={tab}
        messages={
          <>
            <PlatformMessagesPanel
              messages={serializedMessages}
              total={total}
              pageCount={pageCount}
              filters={filters}
              outcomeCounts={countByOutcome(outcomeRows)}
              keyOptions={keyOptions}
            />
            <section className="space-y-3" aria-labelledby="platform-analysis-title">
              <div>
                <h2 id="platform-analysis-title" className="text-base font-semibold">Tendances</h2>
                <p className="mt-1 text-sm text-muted-foreground">Toutes clés et toutes périodes confondues.</p>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <Card><CardHeader><CardTitle className="text-base">Délivrance par canal</CardTitle><CardDescription>Messages directs et API, hors campagnes.</CardDescription></CardHeader><CardContent><DeliveryByChannelChart data={deliveryData} /></CardContent></Card>
                <Card><CardHeader><CardTitle className="text-base">Volume récent</CardTitle><CardDescription>Quatorze derniers jours.</CardDescription></CardHeader><CardContent><MessageVolumeChart data={volumeData} /></CardContent></Card>
              </div>
            </section>
          </>
        }
        verifications={<VerificationsPanel organizationId={orgId} />}
        integrations={
          <>
            {!canManage ? <PlanReadOnlyNotice feature="Les clés API, webhooks et intégrations" /> : null}
            <section className="grid gap-4 lg:grid-cols-3">
              <Metric label="Clés actives" value={activeKeys.toLocaleString("fr-FR")} icon={KeyRound} />
              <Metric label="Webhooks actifs" value={activeWebhooks.toLocaleString("fr-FR")} icon={Webhook} />
              <Metric label="Modèles" value={templates.length.toLocaleString("fr-FR")} icon={MessageSquare} />
            </section>
            <ApiKeysPanel
              canManage={canManage}
              apiKeys={apiKeys.map((key) => ({ id: key.id, name: key.name, keyPrefix: key.keyPrefix, environment: key.environment, defaultEmailSenderId: key.defaultEmailSenderId, lastUsedAt: key.lastUsedAt?.toISOString() ?? null, createdAt: key.createdAt.toISOString(), revokedAt: key.revokedAt?.toISOString() ?? null, recentMessages: recentByKey.get(key.id) ?? 0 }))}
              emailSenders={senderOptions}
            />
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="overflow-hidden"><CardHeader><CardTitle>Webhooks</CardTitle><CardDescription>Endpoints sortants et signés par organisation.</CardDescription></CardHeader><CardContent className="px-0 pb-0"><div className="overflow-x-auto"><Table className="min-w-[580px]"><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>URL</TableHead><TableHead>Événements</TableHead><TableHead>État</TableHead></TableRow></TableHeader><TableBody>{webhooks.length === 0 ? <TableRow><TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">Aucun webhook configuré.</TableCell></TableRow> : webhooks.map((webhook) => <TableRow key={webhook.id}><TableCell className="max-w-36 truncate font-medium">{webhook.name}</TableCell><TableCell className="max-w-56 truncate font-mono text-xs">{webhook.url}</TableCell><TableCell className="font-mono text-xs tabular-nums">{webhook.events.length}</TableCell><TableCell><Badge variant={webhook.active ? "success" : "secondary"}>{webhook.active ? "Actif" : "Inactif"}</Badge></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
              <Card className="overflow-hidden"><CardHeader><CardTitle>Modèles</CardTitle><CardDescription>Références de modèles disponibles pour les intégrations.</CardDescription></CardHeader><CardContent className="px-0 pb-0"><div className="overflow-x-auto"><Table className="min-w-[520px]"><TableHeader><TableRow><TableHead>Clé</TableHead><TableHead>Canal</TableHead><TableHead>Locale</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader><TableBody>{templates.length === 0 ? <TableRow><TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">Aucun modèle d’intégration.</TableCell></TableRow> : templates.map((template) => { const item = serializeTemplate(template); return <TableRow key={item.id}><TableCell className="max-w-44 truncate font-mono text-xs">{item.template_key}</TableCell><TableCell>{item.channel}</TableCell><TableCell className="font-mono text-xs">{item.locale}</TableCell><TableCell><Badge variant={statusVariant(item.status.toUpperCase())}>{item.status}</Badge></TableCell></TableRow>; })}</TableBody></Table></div></CardContent></Card>
            </div>
          </>
        }
      />
    </div>
  );
}
