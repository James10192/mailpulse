"use client";

import { AlertCircle, CheckCircle2, Circle, Clock3, Copy, Eye, Send, Sparkles, Webhook, XCircle } from "lucide-react";
import { toast } from "sonner";
import { MESSAGE_OUTCOMES, MESSAGE_STATUSES, type MessageStatusCode } from "@/lib/mailpulse/message-outcomes";
import { cn } from "@/lib/utils";
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
  messageStatusLabel,
  messageStatusVariant,
  shortIdentifier,
  stringifyJson,
} from "./message-formatters";
import type { ApiMessageDetail } from "./message-types";
import { messageOriginLabel } from "./message-origin";

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
            <SheetTitle className="truncate">{message.recipient.value}</SheetTitle>
            <SheetDescription className="mt-1 flex items-center gap-1 font-mono text-xs">
              <span className="truncate">{message.id}</span>
              <CopyButton value={message.id} label="Copier l'identifiant du message" />
            </SheetDescription>
          </div>
          <Badge variant={messageStatusVariant(message.status)}>{messageStatusLabel(message.status)}</Badge>
        </div>
      </SheetHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Canal" value={message.channel === "whatsapp" ? "WhatsApp" : message.channel === "sms" ? "SMS" : "Email"} />
          <Metric label="Envoyé par" value={message.api_key ? `Clé « ${message.api_key.name} »` : messageOriginLabel(message.origin)} />
          <Metric label="Identifiant fournisseur" value={shortIdentifier(message.provider_message_id, 10, 6)} mono />
          <Metric label="Tentatives" value={String(message.retry_count)} />
        </div>

        <StatusNotice message={message} />

        <Tabs defaultValue="events" className="mt-5">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="events">Parcours</TabsTrigger>
            <TabsTrigger value="content">Contenu</TabsTrigger>
            <TabsTrigger value="overview">Détails</TabsTrigger>
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
              title="Références techniques"
              rows={[
                ["Clé API", message.api_key ? `${message.api_key.name}${message.api_key.revoked ? " (révoquée)" : ""} · ${message.api_key.environment === "LIVE" ? "Production" : "Test"}` : "Aucune"],
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
  const error = message.error_message ?? message.error_code;
  if (error) {
    return (
      <div className="mt-4 rounded-lg border border-destructive/25 bg-destructive/10 p-3" role="status">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertCircle className="size-4" aria-hidden="true" />
          {message.status === "failed" || message.status === "template_required" ? "Raison de l'échec" : "Incident signalé par le fournisseur"}
        </div>
        <p className="mt-2 break-words text-sm">{message.error_message ?? "Aucun détail fournisseur."}</p>
        {message.error_code ? <p className="mt-1 break-words font-mono text-xs text-muted-foreground">{message.error_code}</p> : null}
      </div>
    );
  }

  const outcome = MESSAGE_STATUSES[message.status.toUpperCase() as MessageStatusCode]?.outcome;
  if (!outcome) return null;
  const info = MESSAGE_OUTCOMES[outcome];
  return (
    <div
      role="status"
      className={cn(
        "mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm",
        info.tone === "success" && "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
        info.tone === "warning" && "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300",
        (info.tone === "secondary" || info.tone === "outline" || info.tone === "destructive") && "bg-muted/40",
      )}
    >
      {info.tone === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Clock3 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span><span className="font-medium">{messageStatusLabel(message.status)}.</span> {info.hint}</span>
    </div>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copié.");
    } catch {
      toast.error("La copie a échoué.");
    }
  }
  return (
    <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0" onClick={copy} aria-label={label}>
      <Copy className="size-3.5" aria-hidden="true" />
    </Button>
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
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${title} copié.`);
    } catch {
      toast.error("La copie a échoué.");
    }
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

type Step = { label: string; at: string; icon: typeof Circle; tone: "done" | "failed" | "planned" };

function TimelineRows({ message }: { message: ApiMessageDetail }) {
  const steps: Step[] = [
    { label: "Créé", at: message.created_at, icon: Sparkles, tone: "done" as const },
    message.sent_at ? { label: "Remis au fournisseur", at: message.sent_at, icon: Send, tone: "done" as const } : null,
    message.delivered_at ? { label: "Délivré au destinataire", at: message.delivered_at, icon: CheckCircle2, tone: "done" as const } : null,
    message.read_at ? { label: "Lu", at: message.read_at, icon: Eye, tone: "done" as const } : null,
    message.failed_at ? { label: "Échec", at: message.failed_at, icon: XCircle, tone: "failed" as const } : null,
    message.next_retry_at ? { label: "Nouvel essai prévu", at: message.next_retry_at, icon: Clock3, tone: "planned" as const } : null,
  ].filter((step): step is Step => step !== null).sort((a, b) => a.at.localeCompare(b.at));

  return (
    <section className="rounded-lg border bg-card p-4">
      <ol className="relative space-y-5">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <li key={`${step.label}-${step.at}`} className="relative flex gap-3">
              {index < steps.length - 1 ? <span className="absolute left-[15px] top-8 h-[calc(100%-4px)] w-px bg-border" aria-hidden="true" /> : null}
              <span
                className={cn(
                  "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-card",
                  step.tone === "done" && "border-emerald-500/40 text-emerald-600 dark:text-emerald-400",
                  step.tone === "failed" && "border-red-500/40 text-red-600 dark:text-red-400",
                  step.tone === "planned" && "border-dashed text-muted-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 pt-1">
                <p className="text-sm font-medium">{step.label}</p>
                <p className="font-mono text-xs text-muted-foreground">{formatMessageDate(step.at)}</p>
              </div>
            </li>
          );
        })}
      </ol>
      {message.retry_count > 0 ? (
        <>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            {message.retry_count} nouvelle{message.retry_count > 1 ? "s" : ""} tentative{message.retry_count > 1 ? "s" : ""} après le premier envoi.
          </p>
        </>
      ) : null}
    </section>
  );
}

const WEBHOOK_STATUS_LABELS: Record<string, string> = { PENDING: "En attente", DELIVERED: "Livré", FAILED: "Échec", RETRYING: "Nouvel essai" };

function WebhookTable({ message }: { message: ApiMessageDetail }) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Endpoint</TableHead>
            <TableHead>Événement</TableHead>
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
                  <Badge variant={messageStatusVariant(delivery.status.toLowerCase())}>{WEBHOOK_STATUS_LABELS[delivery.status.toUpperCase()] ?? delivery.status.toLowerCase()}</Badge>
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
