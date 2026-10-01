"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, KeyRound, RotateCw, Send } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { NewKeySecretDialog } from "@/components/dashboard/api-keys/new-key-secret-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HEALTH_LABELS, healthOf } from "@/lib/platform/overview-metrics";
import { cn } from "@/lib/utils";
import type { WebhooksTabData } from "./platform-data";
import { resendWebhook, rotateWebhookSigningSecret, setWebhookActive } from "./webhook-actions";

const STATUS: Record<string, { label: string; tone: "success" | "warning" | "destructive" | "secondary" }> = {
  DELIVERED: { label: "Délivré", tone: "success" },
  RETRYING: { label: "Nouvel essai prévu", tone: "warning" },
  PENDING: { label: "En cours", tone: "secondary" },
  FAILED: { label: "Échec", tone: "destructive" },
};
const ALL = "all";
const dateTime = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

function formatDate(value: string | null) {
  return value ? dateTime.format(new Date(value)) : "—";
}

export function WebhooksPanel({
  data,
  filters,
  canManage,
  disabledReason,
}: {
  data: WebhooksTabData;
  filters: { endpoint: string; status: string; page: number };
  canManage: boolean;
  disabledReason: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [rotating, setRotating] = useState<{ id: string; name: string } | null>(null);
  const [secret, setSecret] = useState<{ value: string; name: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function update(next: { endpoint?: string; deliveryStatus?: string; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [name, value] of Object.entries(next)) {
      if (value && !(name === "page" && value === 1)) params.set(name, String(value));
      else params.delete(name);
    }
    if (!("page" in next)) params.delete("page");
    params.set("tab", "webhooks");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  async function rotate() {
    if (!rotating) return;
    const target = rotating;
    setRotating(null);
    setBusy(target.id);
    const result = await rotateWebhookSigningSecret(target.id);
    setBusy(null);
    if ("error" in result) return toast.error(result.error);
    setSecret({ value: result.secret, name: target.name });
    router.refresh();
  }

  async function toggle(endpointId: string, active: boolean) {
    setBusy(endpointId);
    const result = await setWebhookActive(endpointId, active);
    setBusy(null);
    if ("error" in result) return toast.error(result.error);
    toast.success(active ? "Webhook réactivé." : "Webhook désactivé : il ne reçoit plus d'événements.");
    router.refresh();
  }

  async function resend(deliveryId: string) {
    setBusy(deliveryId);
    const result = await resendWebhook(deliveryId);
    setBusy(null);
    if ("error" in result) return toast.error(result.error);
    if (result.status === "DELIVERED") toast.success("Événement délivré.");
    else toast.error(`Nouvel échec : ${result.lastError ?? "cause inconnue"}.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="webhook-endpoints-title" className="space-y-3">
        <div>
          <h2 id="webhook-endpoints-title" className="text-base font-semibold">Points de réception</h2>
          <p className="mt-1 text-sm text-muted-foreground">Les adresses de vos applications qui reçoivent les événements, avec leur santé sur 7 jours.</p>
        </div>
        {data.endpoints.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Aucun webhook configuré. Créez-en un avec <code className="font-mono text-xs">POST /api/v1/webhooks</code>.</CardContent></Card>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {data.endpoints.map((endpoint) => {
              const counts = { delivered: endpoint.week.delivered, sent: 0, pending: endpoint.week.waiting, failed: endpoint.week.failed, closed: 0 };
              const health = HEALTH_LABELS[healthOf(counts, { available: endpoint.active })];
              const settled = endpoint.week.delivered + endpoint.week.failed;
              return (
                <Card key={endpoint.id} className="min-w-0">
                  <CardHeader className="gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{endpoint.name}</CardTitle>
                        <CardDescription className="truncate font-mono text-xs" title={endpoint.url}>{endpoint.url}</CardDescription>
                      </div>
                      <Badge variant={health.tone}>{health.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                      <div><dt className="text-muted-foreground">Délivrés</dt><dd className="font-mono text-sm tabular-nums">{endpoint.week.delivered.toLocaleString("fr-FR")}</dd></div>
                      <div><dt className="text-muted-foreground">Échecs</dt><dd className="font-mono text-sm tabular-nums">{endpoint.week.failed.toLocaleString("fr-FR")}</dd></div>
                      <div><dt className="text-muted-foreground">En attente</dt><dd className="font-mono text-sm tabular-nums">{endpoint.week.waiting.toLocaleString("fr-FR")}</dd></div>
                      <div><dt className="text-muted-foreground">Réussite</dt><dd className="font-mono text-sm tabular-nums">{settled === 0 ? "—" : percent.format(endpoint.week.delivered / settled)}</dd></div>
                    </dl>
                    <p className="break-words text-xs text-muted-foreground">
                      Dernière livraison réussie : {formatDate(endpoint.lastDeliveredAt)} · {endpoint.events.length} événement{endpoint.events.length > 1 ? "s" : ""} · secret <span className="break-all font-mono">{endpoint.secretPreview}</span>
                    </p>
                    {endpoint.rotationEndsAt ? (
                      <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                        Rotation en cours : l&apos;ancien secret signe encore jusqu&apos;au {formatDate(endpoint.rotationEndsAt)}.
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                      <label className="flex items-center gap-2 text-sm" title={canManage ? undefined : disabledReason}>
                        <Switch
                          checked={endpoint.active}
                          disabled={!canManage || busy === endpoint.id}
                          onCheckedChange={(checked) => toggle(endpoint.id, checked)}
                          aria-label={`Activer le webhook ${endpoint.name}`}
                        />
                        {endpoint.active ? "Actif" : "Désactivé"}
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => update({ endpoint: endpoint.id, page: 1 })}>
                          Voir ses livraisons
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canManage || busy === endpoint.id}
                          title={canManage ? undefined : disabledReason}
                          onClick={() => setRotating({ id: endpoint.id, name: endpoint.name })}
                        >
                          <KeyRound aria-hidden="true" />Changer le secret
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <Card className="overflow-hidden">
        <CardHeader className="gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <CardTitle>Livraisons</CardTitle>
              <CardDescription>Chaque événement envoyé à vos webhooks. Les échecs passagers sont retentés automatiquement jusqu&apos;à six fois.</CardDescription>
            </div>
            <p className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{data.total.toLocaleString("fr-FR")} livraison{data.total > 1 ? "s" : ""}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:max-w-xl">
            <Select value={filters.endpoint || ALL} onValueChange={(value) => update({ endpoint: value === ALL ? "" : value, page: 1 })}>
              <SelectTrigger className="h-10" aria-label="Webhook"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les webhooks</SelectItem>
                {data.endpoints.map((endpoint) => <SelectItem key={endpoint.id} value={endpoint.id}>{endpoint.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status || ALL} onValueChange={(value) => update({ deliveryStatus: value === ALL ? "" : value.toLowerCase(), page: 1 })}>
              <SelectTrigger className="h-10" aria-label="Statut"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tous les statuts</SelectItem>
                {Object.entries(STATUS).map(([value, status]) => (
                  <SelectItem key={value} value={value}>{status.label} ({(data.statusCounts[value as keyof typeof data.statusCounts] ?? 0).toLocaleString("fr-FR")})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className={cn("p-0 transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow><TableHead>Événement</TableHead><TableHead>Webhook</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Essais</TableHead><TableHead>Date</TableHead><TableHead className="w-0"><span className="sr-only">Actions</span></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {data.deliveries.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-28 text-center text-sm text-muted-foreground">Aucune livraison pour ces filtres.</TableCell></TableRow>
                ) : data.deliveries.map((delivery) => {
                  const status = STATUS[delivery.status] ?? { label: delivery.status, tone: "secondary" as const };
                  const canResend = delivery.status === "FAILED" || delivery.status === "RETRYING";
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <p className="font-mono text-xs">{delivery.eventType}</p>
                        {delivery.messageId ? (
                          <Link href={`/dashboard/platform?tab=messages&message=${delivery.messageId}`} className="text-xs text-muted-foreground underline-offset-2 hover:underline">Voir le message</Link>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-40 truncate text-sm">{delivery.endpointName}</TableCell>
                      <TableCell>
                        <Badge variant={status.tone}>{status.label}</Badge>
                        {delivery.lastError && delivery.status !== "DELIVERED" ? <p className="mt-1 text-xs text-muted-foreground">{delivery.lastError}</p> : null}
                        {delivery.nextRetryAt ? <p className="mt-0.5 text-xs text-muted-foreground">Prochain essai : {formatDate(delivery.nextRetryAt)}</p> : null}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular-nums">{delivery.attempts}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(delivery.createdAt)}</TableCell>
                      <TableCell>
                        {canResend ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!canManage || busy === delivery.id}
                            title={canManage ? undefined : disabledReason}
                            onClick={() => resend(delivery.id)}
                          >
                            {busy === delivery.id ? <RotateCw className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
                            Renvoyer
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">Page <span className="font-mono tabular-nums">{filters.page}</span> sur <span className="font-mono tabular-nums">{data.pageCount}</span></p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => update({ page: filters.page - 1 })} disabled={isPending || filters.page <= 1}><ChevronLeft aria-hidden="true" />Précédent</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => update({ page: filters.page + 1 })} disabled={isPending || filters.page >= data.pageCount}>Suivant<ChevronRight aria-hidden="true" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={rotating !== null}
        title="Changer le secret de signature ?"
        message={`Un nouveau secret sera affiché une seule fois. Pendant 24 heures, « ${rotating?.name ?? ""} » recevra une signature avec chacun des deux secrets : mettez à jour votre application avant la fin.`}
        confirmLabel="Changer le secret"
        onConfirm={rotate}
        onCancel={() => setRotating(null)}
      />
      <NewKeySecretDialog
        secret={secret?.value ?? null}
        keyName={secret?.name ?? ""}
        title={`Nouveau secret pour « ${secret?.name ?? ""} »`}
        warning="MailPulse ne pourra plus l'afficher. L'ancien secret signe encore pendant 24 heures : remplacez-le dans votre application d'ici là."
        onClose={() => setSecret(null)}
      />
    </div>
  );
}
