import { Activity, Cable, CheckCircle2, KeyRound, MessageSquare, Radio, ShieldCheck, Webhook } from "lucide-react";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { serializeMessage, serializeTemplate, serializeWebhook } from "@/lib/mailpulse/serializers";
import { DeliveryByChannelChart, MessageVolumeChart } from "./platform-charts";
import { ApiKeysPanel } from "./platform-client";

function statusVariant(status: string) {
  if (["DELIVERED", "SENT", "READ", "APPROVED"].includes(status)) return "success" as const;
  if (["FAILED", "REJECTED", "TEMPLATE_REQUIRED"].includes(status)) return "destructive" as const;
  if (["RETRYING", "PENDING_REVIEW"].includes(status)) return "warning" as const;
  return "secondary" as const;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof MessageSquare;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-zinc-400" />
      </CardContent>
    </Card>
  );
}

export default async function PlatformPage() {
  const { org } = await getCurrentUserAndOrg();
  const orgId = org?.id ?? "";

  const [
    apiKeys,
    messages,
    templates,
    webhooks,
    conversationsCount,
    webhookDeliveryCounts,
    channelCounts,
    dailyMessages,
  ] = await Promise.all([
    prisma.integrationApiKey.findMany({
      where: { organizationId: orgId, provider: "MAILPULSE" },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.communicationMessage.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.communicationTemplate.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: "desc" },
      take: 12,
    }),
    prisma.webhookEndpoint.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.conversation.count({ where: { organizationId: orgId } }),
    prisma.webhookDelivery.groupBy({
      by: ["status"],
      where: { organizationId: orgId },
      _count: { _all: true },
    }),
    prisma.communicationMessage.groupBy({
      by: ["channel", "status"],
      where: { organizationId: orgId },
      _count: { _all: true },
    }),
    prisma.communicationMessage.groupBy({
      by: ["createdAt"],
      where: { organizationId: orgId },
      _count: { _all: true },
      orderBy: { createdAt: "asc" },
      take: 14,
    }),
  ]);

  const serializedMessages = messages.map(serializeMessage);
  const serializedTemplates = templates.map(serializeTemplate);
  const serializedWebhooks = webhooks.map(serializeWebhook);
  const activeKeys = apiKeys.filter((key) => !key.revokedAt).length;
  const deliveredWebhookCount = webhookDeliveryCounts.find((item) => item.status === "DELIVERED")?._count._all ?? 0;
  const failedWebhookCount = webhookDeliveryCounts.find((item) => item.status === "FAILED")?._count._all ?? 0;

  const deliveryData = ["EMAIL", "WHATSAPP", "SMS"].map((channel) => ({
    channel: channel.toLowerCase(),
    queued: channelCounts.filter((item) => item.channel === channel && item.status === "QUEUED").reduce((sum, item) => sum + item._count._all, 0),
    delivered: channelCounts.filter((item) => item.channel === channel && item.status === "DELIVERED").reduce((sum, item) => sum + item._count._all, 0),
    failed: channelCounts.filter((item) => item.channel === channel && ["FAILED", "TEMPLATE_REQUIRED"].includes(item.status)).reduce((sum, item) => sum + item._count._all, 0),
  }));

  const volumeData = dailyMessages.map((item) => ({
    date: item.createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    messages: item._count._all,
  }));

  return (
    <div className="page-stack app-shell-safe">
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Platform" }]} />
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Communication Platform</h1>
        <p className="max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
          API générique multi-tenant pour contacts, messages, templates, conversations, webhooks et contraintes fournisseurs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Messages V1" value={messages.length} icon={MessageSquare} />
        <StatCard label="Conversations" value={conversationsCount} icon={Activity} />
        <StatCard label="Clés actives" value={activeKeys} icon={KeyRound} />
        <StatCard label="Webhooks OK / KO" value={`${deliveredWebhookCount}/${failedWebhookCount}`} icon={Webhook} />
      </div>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Messages récents</CardTitle>
                <CardDescription>Statuts durables, indépendants du métier client.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Canal</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créé</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serializedMessages.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                          Aucun message V1 pour le moment.
                        </TableCell>
                      </TableRow>
                    ) : (
                      serializedMessages.map((message) => (
                        <TableRow key={message.id}>
                          <TableCell>{message.channel}</TableCell>
                          <TableCell className="font-mono text-xs">{message.recipient.value}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(message.status.toUpperCase())}>{message.status}</Badge>
                          </TableCell>
                          <TableCell>{new Date(message.created_at).toLocaleString("fr-FR")}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Templates</CardTitle>
                <CardDescription>Clés de templates client, y compris WhatsApp approuvé.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clé</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Locale</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serializedTemplates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                          Aucun template V1.
                        </TableCell>
                      </TableRow>
                    ) : (
                      serializedTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-mono text-xs">{template.template_key}</TableCell>
                          <TableCell>{template.channel}</TableCell>
                          <TableCell>{template.locale}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(template.status.toUpperCase())}>{template.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: "Email", icon: Cable, description: "Resend et domaines vérifiés restent le chemin fournisseur initial." },
              { label: "WhatsApp", icon: Radio, description: "Fenêtre 24h appliquée par MailPulse avant envoi libre." },
              { label: "SMS", icon: ShieldCheck, description: "Canal exposé dans l’API, fournisseur branchable sans changer les clients." },
            ].map((channel) => (
              <Card key={channel.label}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <channel.icon className="h-4 w-4 text-orange-500" />
                    {channel.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-500 dark:text-zinc-400">{channel.description}</CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          <ApiKeysPanel
            apiKeys={apiKeys.map((key) => ({
              id: key.id,
              name: key.name,
              keyPrefix: key.keyPrefix,
              environment: key.environment,
              lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
              createdAt: key.createdAt.toISOString(),
              revokedAt: key.revokedAt?.toISOString() ?? null,
            }))}
          />

          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Endpoints sortants signés HMAC avec événements génériques.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>URL</TableHead>
                    <TableHead>Events</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {serializedWebhooks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-sm text-zinc-500">
                        Aucun webhook configuré.
                      </TableCell>
                    </TableRow>
                  ) : (
                    serializedWebhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell>{webhook.name}</TableCell>
                        <TableCell className="max-w-xs truncate font-mono text-xs">{webhook.url}</TableCell>
                        <TableCell>{webhook.events.length}</TableCell>
                        <TableCell>
                          <Badge variant={webhook.active ? "success" : "secondary"}>{webhook.active ? "active" : "inactive"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Livraison par canal</CardTitle>
                <CardDescription>Queued, delivered et failed/template required.</CardDescription>
              </CardHeader>
              <CardContent>
                <DeliveryByChannelChart data={deliveryData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Volume récent</CardTitle>
                <CardDescription>Messages V1 récents par date de création.</CardDescription>
              </CardHeader>
              <CardContent>
                <MessageVolumeChart data={volumeData.length > 0 ? volumeData : [{ date: "Aujourd’hui", messages: 0 }]} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Quotas et isolation</CardTitle>
              <CardDescription>Les limites restent appliquées par organisation MailPulse.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-zinc-500">Tenant</p>
                <p className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100">{orgId || "unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Plan</p>
                <p className="mt-1 font-mono text-sm text-zinc-900 dark:text-zinc-100">{org?.plan ?? "FREE"}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Policy</p>
                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Prisma durable + Convex live mirror</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />
    </div>
  );
}
