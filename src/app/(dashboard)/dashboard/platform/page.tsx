import { Activity, Cable, KeyRound, MessageSquare, Send, Webhook } from "lucide-react";
import Link from "next/link";
import type { CommunicationChannel, MessageStatus, Prisma } from "@/generated/prisma";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { serializeMessage, serializeTemplate } from "@/lib/mailpulse/serializers";
import { DeliveryByChannelChart, MessageVolumeChart } from "./platform-charts";
import { ApiKeysPanel } from "./platform-client";
import { PlatformMessagesPanel, type ApiMessageDetail } from "./platform-messages-panel";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const validChannels = new Set(["email", "whatsapp", "sms"]);
const validStatuses = new Set(["queued", "retrying", "sent", "delivered", "read", "failed", "cancelled", "template_required"]);
const compactDateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });

function statusVariant(status: string) {
  if (["DELIVERED", "SENT", "READ", "APPROVED"].includes(status)) return "success" as const;
  if (["FAILED", "REJECTED", "TEMPLATE_REQUIRED"].includes(status)) return "destructive" as const;
  if (["RETRYING", "PENDING_REVIEW", "QUEUED"].includes(status)) return "warning" as const;
  return "secondary" as const;
}

function readValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeFilters(searchParams: Record<string, string | string[] | undefined>) {
  const channel = readValue(searchParams.channel).toLowerCase();
  const origin = readValue(searchParams.origin).toLowerCase();
  const status = readValue(searchParams.status).toLowerCase();
  const page = Math.max(1, Number.parseInt(readValue(searchParams.page), 10) || 1);

  return {
    query: readValue(searchParams.query).slice(0, 160),
    channel: validChannels.has(channel) ? channel : "",
    origin: ["api", "platform", "legacy"].includes(origin) ? origin : "",
    status: validStatuses.has(status) ? status : "",
    page,
  };
}

function messageOriginWhere(origin: string): Prisma.CommunicationMessageWhereInput | null {
  if (origin === "api") return { origin: "API" };
  if (origin === "platform") return { origin: "PLATFORM" };
  if (origin === "legacy") return { origin: null };
  return null;
}

function buildMessageWhere(orgId: string, filters: ReturnType<typeof normalizeFilters>): Prisma.CommunicationMessageWhereInput {
  const conditions: Prisma.CommunicationMessageWhereInput[] = [
    {
      OR: [
        { origin: "API" },
        { origin: "PLATFORM" },
        { origin: null },
      ],
    },
  ];
  const originWhere = messageOriginWhere(filters.origin);
  if (originWhere) conditions.push(originWhere);
  if (filters.channel) conditions.push({ channel: filters.channel.toUpperCase() as CommunicationChannel });
  if (filters.status) conditions.push({ status: filters.status.toUpperCase() as MessageStatus });
  if (filters.query) {
    conditions.push({
      OR: [
        { recipientValue: { contains: filters.query, mode: "insensitive" } },
        { providerMessageId: { contains: filters.query, mode: "insensitive" } },
        { contact: { is: { OR: [{ email: { contains: filters.query, mode: "insensitive" } }, { firstName: { contains: filters.query, mode: "insensitive" } }, { lastName: { contains: filters.query, mode: "insensitive" } }] } } },
      ],
    });
  }

  return { organizationId: orgId, AND: conditions };
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof MessageSquare }) {
  return (
    <div className="flex min-w-0 items-center gap-3 px-4 py-3 sm:px-5">
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
  const orgId = org?.id ?? "";
  const filters = normalizeFilters(await searchParams);
  const messageWhere = buildMessageWhere(orgId, filters);
  const now = new Date();
  const sinceYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sinceFortnight = new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000);
  const monitoringWhere = buildMessageWhere(orgId, { ...filters, query: "", channel: "", origin: "", status: "", page: 1 });

  const [
    apiKeys,
    messages,
    total,
    templates,
    webhooks,
    conversationsCount,
    lastDayCount,
    deliveredCount,
    attentionCount,
    channelCounts,
    recentMessages,
    emailSenders,
  ] = await Promise.all([
    prisma.integrationApiKey.findMany({ where: { organizationId: orgId, provider: "MAILPULSE" }, orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.communicationMessage.findMany({
      where: messageWhere,
      include: {
        contact: { select: { email: true, phone: true, firstName: true, lastName: true } },
        template: { select: { templateKey: true, name: true, providerTemplateId: true } },
        webhookDeliveries: { orderBy: { createdAt: "desc" }, take: 5, include: { endpoint: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.communicationMessage.count({ where: messageWhere }),
    prisma.communicationTemplate.findMany({ where: { organizationId: orgId }, orderBy: { updatedAt: "desc" }, take: 12 }),
    prisma.webhookEndpoint.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.conversation.count({ where: { organizationId: orgId } }),
    prisma.communicationMessage.count({ where: { ...monitoringWhere, createdAt: { gte: sinceYesterday } } }),
    prisma.communicationMessage.count({ where: { ...monitoringWhere, status: "DELIVERED", createdAt: { gte: sinceYesterday } } }),
    prisma.communicationMessage.count({ where: { ...monitoringWhere, status: { in: ["FAILED", "TEMPLATE_REQUIRED", "RETRYING"] } } }),
    prisma.communicationMessage.groupBy({ by: ["channel", "status"], where: monitoringWhere, _count: { _all: true } }),
    prisma.communicationMessage.findMany({ where: { ...monitoringWhere, createdAt: { gte: sinceFortnight } }, select: { createdAt: true } }),
    prisma.emailSender.findMany({ where: { organizationId: orgId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], select: { id: true, name: true, email: true, isDefault: true } }),
  ]);

  const serializedMessages: ApiMessageDetail[] = messages.map((message) => ({
    ...serializeMessage(message),
    origin: message.origin === "API" ? "api" : message.origin === "PLATFORM" ? "platform" : "legacy",
    contact: message.contact ? { email: message.contact.email, phone: message.contact.phone, first_name: message.contact.firstName, last_name: message.contact.lastName } : null,
    template: message.template ? { key: message.template.templateKey, name: message.template.name, provider_template_id: message.template.providerTemplateId } : null,
    webhook_deliveries: message.webhookDeliveries.map((delivery) => ({ id: delivery.id, endpoint_name: delivery.endpoint.name, event_type: delivery.eventType, status: delivery.status, attempts: delivery.attempts, last_error: delivery.lastError, delivered_at: delivery.deliveredAt?.toISOString() ?? null })),
  }));

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
          <p className="mt-1 max-w-2xl text-pretty text-sm text-muted-foreground">Consultez les communications directes et API, puis agissez sur les intégrations qui les alimentent.</p>
        </div>
        <Button asChild className="min-h-11 shrink-0"><Link href="/dashboard/messaging"><Send className="size-4" />Envoyer un message</Link></Button>
      </header>

      <div className="grid overflow-hidden rounded-lg border border-zinc-200 bg-card shadow-[0_1px_2px_rgba(24,24,27,0.04)] dark:border-zinc-800 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Messages, 24 h" value={lastDayCount.toLocaleString("fr-FR")} icon={MessageSquare} />
        <Metric label="Délivrés, 24 h" value={deliveredCount.toLocaleString("fr-FR")} icon={Activity} />
        <Metric label="À traiter" value={attentionCount.toLocaleString("fr-FR")} icon={Cable} />
        <Metric label="Conversations" value={conversationsCount.toLocaleString("fr-FR")} icon={MessageSquare} />
      </div>

      <Tabs defaultValue="messages" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 sm:w-auto">
          <TabsTrigger value="messages" className="min-h-10 px-4">Messages</TabsTrigger>
          <TabsTrigger value="integrations" className="min-h-10 px-4">Intégrations</TabsTrigger>
        </TabsList>

        <TabsContent value="messages" className="space-y-6">
          <PlatformMessagesPanel messages={serializedMessages} total={total} pageCount={pageCount} filters={filters} />
          <section className="space-y-3" aria-labelledby="platform-analysis-title">
            <div>
              <h2 id="platform-analysis-title" className="text-base font-semibold">Analyse</h2>
              <p className="mt-1 text-sm text-muted-foreground">Le volume et les issues restent secondaires à la lecture du registre.</p>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              <Card><CardHeader><CardTitle className="text-base">Délivrance par canal</CardTitle><CardDescription>Communications directes et API, hors campagnes.</CardDescription></CardHeader><CardContent><DeliveryByChannelChart data={deliveryData} /></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">Volume récent</CardTitle><CardDescription>Quatorze derniers jours.</CardDescription></CardHeader><CardContent><MessageVolumeChart data={volumeData} /></CardContent></Card>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-3">
            <Metric label="Clés actives" value={activeKeys.toLocaleString("fr-FR")} icon={KeyRound} />
            <Metric label="Webhooks actifs" value={activeWebhooks.toLocaleString("fr-FR")} icon={Webhook} />
            <Metric label="Modèles" value={templates.length.toLocaleString("fr-FR")} icon={MessageSquare} />
          </section>
          <ApiKeysPanel apiKeys={apiKeys.map((key) => ({ id: key.id, name: key.name, keyPrefix: key.keyPrefix, environment: key.environment, defaultEmailSenderId: key.defaultEmailSenderId, lastUsedAt: key.lastUsedAt?.toISOString() ?? null, createdAt: key.createdAt.toISOString(), revokedAt: key.revokedAt?.toISOString() ?? null }))} emailSenders={emailSenders} />
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden"><CardHeader><CardTitle>Webhooks</CardTitle><CardDescription>Endpoints sortants et signés par organisation.</CardDescription></CardHeader><CardContent className="px-0 pb-0"><div className="overflow-x-auto"><Table className="min-w-[580px]"><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>URL</TableHead><TableHead>Événements</TableHead><TableHead>État</TableHead></TableRow></TableHeader><TableBody>{webhooks.length === 0 ? <TableRow><TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">Aucun webhook configuré.</TableCell></TableRow> : webhooks.map((webhook) => <TableRow key={webhook.id}><TableCell className="max-w-36 truncate font-medium">{webhook.name}</TableCell><TableCell className="max-w-56 truncate font-mono text-xs">{webhook.url}</TableCell><TableCell className="font-mono text-xs tabular-nums">{webhook.events.length}</TableCell><TableCell><Badge variant={webhook.active ? "success" : "secondary"}>{webhook.active ? "Actif" : "Inactif"}</Badge></TableCell></TableRow>)}</TableBody></Table></div></CardContent></Card>
            <Card className="overflow-hidden"><CardHeader><CardTitle>Modèles</CardTitle><CardDescription>Références de modèles disponibles pour les intégrations.</CardDescription></CardHeader><CardContent className="px-0 pb-0"><div className="overflow-x-auto"><Table className="min-w-[520px]"><TableHeader><TableRow><TableHead>Clé</TableHead><TableHead>Canal</TableHead><TableHead>Locale</TableHead><TableHead>Statut</TableHead></TableRow></TableHeader><TableBody>{templates.length === 0 ? <TableRow><TableCell colSpan={4} className="h-28 text-center text-sm text-muted-foreground">Aucun modèle d’intégration.</TableCell></TableRow> : templates.map((template) => { const item = serializeTemplate(template); return <TableRow key={item.id}><TableCell className="max-w-44 truncate font-mono text-xs">{item.template_key}</TableCell><TableCell>{item.channel}</TableCell><TableCell className="font-mono text-xs">{item.locale}</TableCell><TableCell><Badge variant={statusVariant(item.status.toUpperCase())}>{item.status}</Badge></TableCell></TableRow>; })}</TableBody></Table></div></CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
      <Separator />
    </div>
  );
}
