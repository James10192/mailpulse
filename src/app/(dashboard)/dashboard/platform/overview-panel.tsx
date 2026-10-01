import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Mail, MessageCircle, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { PlatformOverview, OverviewChannel } from "@/lib/platform/overview";
import { HEALTH_LABELS, OVERVIEW_PERIODS, type Comparison, type OverviewPeriod } from "@/lib/platform/overview-metrics";

const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 1 });
const signedPercent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });
const signedPoints = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, signDisplay: "exceptZero" });

const CHANNEL_LABELS: Record<OverviewChannel, { label: string; icon: typeof Mail }> = {
  EMAIL: { label: "E-mail", icon: Mail },
  WHATSAPP: { label: "WhatsApp", icon: MessageCircle },
  SMS: { label: "SMS", icon: Smartphone },
};

type RegistryFilter = { outcome?: string; channel?: string; sender?: string };

/** The registry, already filtered on what the figure counts. */
function registryHref(period: OverviewPeriod, filter: RegistryFilter = {}) {
  const params = new URLSearchParams({ tab: "messages", period });
  for (const [name, value] of Object.entries(filter)) if (value) params.set(name, value);
  return `/dashboard/platform?${params.toString()}`;
}

function Trend({ comparison, higherIsBetter, previousLabel }: { comparison: Comparison; higherIsBetter: boolean; previousLabel: string }) {
  if (comparison.change === null || comparison.change === 0) {
    return <p className="text-xs text-muted-foreground">{comparison.previous === null ? "Pas de période précédente" : `${number.format(comparison.previous)} ${previousLabel}`}</p>;
  }
  const up = comparison.change > 0;
  const good = up === higherIsBetter;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={cn("flex items-center gap-1 text-xs", good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="font-mono tabular-nums">{signedPercent.format(comparison.change)}</span>
      <span className="text-muted-foreground">({number.format(comparison.previous ?? 0)} {previousLabel})</span>
    </p>
  );
}

function Kpi({ label, value, href, children }: { label: string; value: string; href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="group rounded-lg border bg-card px-4 py-3 transition-colors hover:border-orange-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:px-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</p>
      <div className="mt-1">{children}</div>
    </Link>
  );
}

function HealthBadge({ state }: { state: keyof typeof HEALTH_LABELS }) {
  const health = HEALTH_LABELS[state];
  return <Badge variant={health.tone}>{health.label}</Badge>;
}

export function OverviewPanel({ overview }: { overview: PlatformOverview }) {
  const { period } = overview;
  const previousLabel = "la période précédente";
  const rate = overview.successRate;
  const ratePoints = rate.current !== null && rate.previous !== null ? (rate.current - rate.previous) * 100 : null;

  return (
    <div className="space-y-6">
      <nav aria-label="Période" className="flex flex-wrap gap-2">
        {(Object.keys(OVERVIEW_PERIODS) as OverviewPeriod[]).map((value) => (
          <Link
            key={value}
            href={`/dashboard/platform?tab=overview&period=${value}`}
            aria-current={value === period ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-md border px-3 text-sm transition-colors",
              value === period ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {OVERVIEW_PERIODS[value].label}
          </Link>
        ))}
      </nav>

      <section aria-labelledby="overview-changes-title">
        <h2 id="overview-changes-title" className="sr-only">Ce qui a changé</h2>
        {overview.changes.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">
            <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-500" />
            Rien d&apos;inhabituel par rapport à la période précédente.
          </p>
        ) : (
          <ul className="space-y-2">
            {overview.changes.map((change) => (
              <li key={change.message} className={cn("flex items-start gap-2 rounded-lg border px-4 py-3 text-sm", change.tone === "destructive" ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5")}>
                <AlertTriangle aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", change.tone === "destructive" ? "text-red-500" : "text-amber-500")} />
                {change.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Indicateurs" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Messages" value={number.format(overview.volume.current)} href={registryHref(period)}>
          <Trend comparison={overview.volume} higherIsBetter previousLabel={previousLabel} />
        </Kpi>
        <Kpi label="Taux de réussite" value={rate.current === null ? "—" : percent.format(rate.current)} href={registryHref(period)}>
          <p className="text-xs text-muted-foreground">
            {ratePoints === null ? "Délivrés et envoyés, sur les messages aboutis" : <><span className={cn("font-mono tabular-nums", ratePoints < 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>{signedPoints.format(ratePoints)} pt</span> par rapport à {previousLabel}</>}
          </p>
        </Kpi>
        <Kpi label="Échecs" value={number.format(overview.failed.current)} href={registryHref(period, { outcome: "failed" })}>
          <Trend comparison={overview.failed} higherIsBetter={false} previousLabel={previousLabel} />
        </Kpi>
        <Kpi label="En cours" value={number.format(overview.totals.current.pending)} href={registryHref(period, { outcome: "pending" })}>
          <p className="text-xs text-muted-foreground">En file, en envoi ou en attente d&apos;accord</p>
        </Kpi>
      </section>

      <section aria-labelledby="overview-channels-title" className="space-y-3">
        <h2 id="overview-channels-title" className="text-base font-semibold">Santé des canaux</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {overview.channels.map((channel) => {
            const { label, icon: Icon } = CHANNEL_LABELS[channel.channel];
            return (
              <Link key={channel.channel} href={registryHref(period, { channel: channel.channel.toLowerCase() })} className="rounded-lg border bg-card p-4 transition-colors hover:border-orange-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium"><Icon aria-hidden="true" className="size-4 text-muted-foreground" />{label}</span>
                  <HealthBadge state={channel.health} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div><dt className="text-muted-foreground">Envois</dt><dd className="font-mono text-sm tabular-nums">{number.format(channel.volume.current)}</dd></div>
                  <div><dt className="text-muted-foreground">Réussite</dt><dd className="font-mono text-sm tabular-nums">{channel.successRate === null ? "—" : percent.format(channel.successRate)}</dd></div>
                  <div><dt className="text-muted-foreground">Échecs</dt><dd className="font-mono text-sm tabular-nums">{number.format(channel.counts.failed)}</dd></div>
                </dl>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Causes d&apos;échec</CardTitle>
            <CardDescription>Ce qui a fait échouer les messages de la période, et quoi faire.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {overview.failures.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Aucun échec sur la période.</p>
            ) : (
              <ul className="divide-y">
                {overview.failures.slice(0, 8).map((failure) => (
                  <li key={failure.label} className="flex gap-3 px-6 py-3">
                    <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums">{number.format(failure.count)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{failure.label}</p>
                      {failure.remediation ? <p className="mt-0.5 text-xs text-muted-foreground">{failure.remediation}</p> : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base">Numéros WhatsApp</CardTitle>
            <CardDescription>Chaque numéro d&apos;envoi, celui de l&apos;organisation et ceux des applications.</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {overview.senders.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">Aucun numéro WhatsApp configuré.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[520px]">
                  <TableHeader>
                    <TableRow><TableHead>Numéro</TableHead><TableHead>État</TableHead><TableHead className="text-right">Envois</TableHead><TableHead className="text-right">Réussite</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.senders.map((sender) => (
                      <TableRow key={sender.key}>
                        <TableCell className="max-w-56">
                          <Link href={registryHref(period, { channel: "whatsapp", sender: sender.key })} className="block truncate font-medium hover:underline">{sender.label}</Link>
                          <p className="truncate text-xs text-muted-foreground">{sender.application ?? "Messages sans application"} · {sender.provider === "META" ? "Cloud API" : "Evolution"}</p>
                        </TableCell>
                        <TableCell><HealthBadge state={sender.health} /></TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">{number.format(sender.counts.delivered + sender.counts.sent + sender.counts.pending + sender.counts.failed + sender.counts.closed)}</TableCell>
                        <TableCell className="text-right font-mono text-xs tabular-nums">{sender.successRate === null ? "—" : percent.format(sender.successRate)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        Les chiffres comptent les messages directs, ceux de l&apos;API et les commandes signées des applications externes ; les campagnes ont leur propre suivi.
        Le registre des messages ne liste que les messages directs et API : le détail des commandes signées est dans Applications externes.
      </p>
    </div>
  );
}
