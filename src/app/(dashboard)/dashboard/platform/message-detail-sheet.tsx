"use client";

import { AlertCircle, CheckCircle2, Clock3, Copy, MessageSquare, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatMessageDate,
  messageContactLabel,
  messageStatusVariant,
  shortIdentifier,
  stringifyJson,
} from "./message-formatters";
import type { ApiMessageDetail } from "./message-types";

export function MessageDetailSheet({
  message,
  onOpenChange,
}: {
  message: ApiMessageDetail | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!message} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-hidden p-0 sm:max-w-2xl">
        {message ? <MessageDetailContent message={message} /> : null}
      </SheetContent>
    </Sheet>
  );
}

function MessageDetailContent({ message }: { message: ApiMessageDetail }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <div className="flex items-start justify-between gap-4 pr-8">
          <div className="min-w-0">
            <SheetTitle className="flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              Message API
            </SheetTitle>
            <SheetDescription className="mt-1 truncate font-mono text-xs">
              {message.id}
            </SheetDescription>
          </div>
          <Badge variant={messageStatusVariant(message.status)}>{message.status}</Badge>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Canal" value={message.channel} />
          <Metric label="Provider" value={shortIdentifier(message.provider_message_id, 10, 6)} mono />
          <Metric label="Tentatives" value={String(message.retry_count)} />
        </div>

        <StatusNotice message={message} />

        <Tabs defaultValue="overview" className="mt-5">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Résumé</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="events">Timeline</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <DetailGroup
              title="Destinataire"
              rows={[
                ["Type", message.recipient.type],
                ["Valeur", message.recipient.value],
                ["Contact", messageContactLabel(message)],
                ["Email", message.contact?.email ?? "Non lié"],
                ["Téléphone", message.contact?.phone ?? "Non lié"],
              ]}
            />
            <DetailGroup
              title="Références API"
              rows={[
                ["Idempotency", message.idempotency_key ?? "Non renseigné"],
                ["Conversation", message.conversation_id ?? "Non renseigné"],
                ["External event", message.external_event_id ?? "Non renseigné"],
                ["External user", message.external_user_id ?? "Non renseigné"],
                ["External tenant", message.external_tenant_id ?? "Non renseigné"],
              ]}
            />
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <DetailGroup
              title="Template"
              rows={[
                ["Type", message.content.type],
                ["Clé", message.template?.key ?? message.content.template_key ?? "Non renseigné"],
                ["Nom", message.template?.name ?? "Non renseigné"],
                ["Provider template", message.template?.provider_template_id ?? "Non renseigné"],
                ["Locale", message.content.locale ?? "Non renseigné"],
              ]}
            />
            {message.content.text ? <CodeBlock title="Message" value={message.content.text} /> : null}
            <CodeBlock title="Variables" value={stringifyJson(message.content.variables)} />
            <CodeBlock title="Métadonnées" value={stringifyJson(message.metadata)} />
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <TimelineRows message={message} />
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-4">
            <WebhookTable message={message} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatusNotice({ message }: { message: ApiMessageDetail }) {
  if (message.error_code || message.error_message) {
    return (
      <div className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertCircle className="size-4" />
          Erreur provider
        </div>
        <p className="mt-2 break-words font-mono text-xs text-destructive">{message.error_code ?? "provider_error"}</p>
        <p className="mt-1 break-words text-sm">{message.error_message ?? "Aucun détail fournisseur."}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
      <span className="flex items-center gap-2 font-medium">
        <CheckCircle2 className="size-4" />
        Aucun détail d&apos;erreur enregistré.
      </span>
    </div>
  );
}

function Metric({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? "mt-1 truncate font-mono text-xs" : "mt-1 truncate text-sm font-medium"}>{value}</p>
    </div>
  );
}

function DetailGroup({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-medium">{title}</h3>
      </div>
      <div className="divide-y">
        {rows.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[9rem_minmax(0,1fr)]">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="min-w-0 break-words font-mono text-xs">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CodeBlock({ title, value }: { title: string; value: string }) {
  async function copyValue() {
    await navigator.clipboard.writeText(value).catch(() => undefined);
  }

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-medium">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={copyValue}>
          <Copy className="size-4" />
          Copier
        </Button>
      </div>
      <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words p-4 text-xs leading-relaxed">
        {value}
      </pre>
    </section>
  );
}

function TimelineRows({ message }: { message: ApiMessageDetail }) {
  const rows: [string, string | null][] = [
    ["Créé", message.created_at],
    ["En file", message.queued_at],
    ["Envoyé", message.sent_at],
    ["Délivré", message.delivered_at],
    ["Lu", message.read_at],
    ["Échec", message.failed_at],
    ["Prochaine tentative", message.next_retry_at],
  ];

  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Clock3 className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Timeline</h3>
      </div>
      <div className="divide-y">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm">{label}</span>
            <span className="font-mono text-xs text-muted-foreground">{formatMessageDate(value)}</span>
          </div>
        ))}
      </div>
      <Separator />
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm">Tentatives</span>
        <span className="font-mono text-xs text-muted-foreground">{message.retry_count}</span>
      </div>
    </section>
  );
}

function WebhookTable({ message }: { message: ApiMessageDetail }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Endpoint</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Essais</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {message.webhook_deliveries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-20 text-center text-sm text-muted-foreground">
                Aucun webhook enregistré pour ce message.
              </TableCell>
            </TableRow>
          ) : (
            message.webhook_deliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                <TableCell className="max-w-[10rem] truncate">{delivery.endpoint_name}</TableCell>
                <TableCell className="max-w-[10rem] truncate font-mono text-xs">{delivery.event_type}</TableCell>
                <TableCell>
                  <Badge variant={messageStatusVariant(delivery.status.toLowerCase())}>{delivery.status.toLowerCase()}</Badge>
                </TableCell>
                <TableCell>{delivery.attempts}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {message.webhook_deliveries.some((delivery) => delivery.last_error) ? (
        <div className="border-t p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <Webhook className="size-4" />
            Erreurs webhooks
          </div>
          <div className="mt-2 space-y-2">
            {message.webhook_deliveries
              .filter((delivery) => delivery.last_error)
              .map((delivery) => (
                <p key={delivery.id} className="break-words font-mono text-xs text-muted-foreground">
                  {delivery.endpoint_name}: {delivery.last_error}
                </p>
              ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
