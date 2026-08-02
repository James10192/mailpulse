"use client";

import { useMemo, useState, useTransition, type ElementType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Edit,
  Eye,
  Mail,
  MessageCircle,
  MousePointerClick,
  Plus,
  Send,
  Smartphone,
  Sparkles,
} from "lucide-react";

import { LimitWarningBanner } from "@/components/dashboard/feature-gate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cancelCampaign, deleteCampaign } from "./actions";
import { CampaignChannelChart, CampaignPerformanceChart } from "./campaigns-charts";
import {
  campaignSentCount,
  formatNumber,
  formatRate,
  getClickOrReplyRate,
  getOpenRate,
  statusLabels,
  type Campaign,
  type CampaignSort,
  type SenderInfo,
} from "./campaigns-types";
import { CampaignActions, ChannelBadge, StatusBadge } from "./campaigns-ui";

const sortOptions: Array<{ label: string; value: CampaignSort }> = [
  { label: "Plus récentes", value: "date-desc" },
  { label: "Plus anciennes", value: "date-asc" },
  { label: "Nom A-Z", value: "name-asc" },
  { label: "Performance", value: "performance" },
];

function buildSummary(campaigns: Campaign[]) {
  return campaigns.reduce(
    (acc, campaign) => {
      acc.total += 1;
      acc[campaign.channel.toLowerCase() as "email" | "whatsapp" | "sms"] += 1;
      if (campaign.status === "SENT") acc.sent += 1;
      if (campaign.status === "DRAFT") acc.drafts += 1;
      if (campaign.status === "SCHEDULED" || campaign.status === "SENDING") acc.active += 1;
      acc.recipients += campaign._count?.recipients ?? 0;
      acc.sentVolume += campaignSentCount(campaign);
      acc.opened += campaign.channel === "WHATSAPP" ? campaign.whatsappAnalytics?.read ?? 0 : campaign.analytics?.totalOpened ?? 0;
      acc.clickedOrReplied += campaign.channel === "WHATSAPP" ? campaign.whatsappAnalytics?.replied ?? 0 : campaign.analytics?.totalClicked ?? 0;
      return acc;
    },
    { total: 0, email: 0, whatsapp: 0, sms: 0, sent: 0, drafts: 0, active: 0, recipients: 0, sentVolume: 0, opened: 0, clickedOrReplied: 0 },
  );
}

function filterCampaigns(campaigns: Campaign[], channel: string, status: string, search: string, sortBy: CampaignSort) {
  const query = search.trim().toLowerCase();
  return campaigns
    .filter((campaign) => {
      const matchesChannel = channel === "ALL" || campaign.channel === channel;
      const matchesStatus = status === "ALL" || campaign.status === status;
      const matchesSearch = !query || campaign.name.toLowerCase().includes(query) || (campaign.subject ?? "").toLowerCase().includes(query);
      return matchesChannel && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "date-asc") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "performance") return getOpenRate(b) + getClickOrReplyRate(b) - (getOpenRate(a) + getClickOrReplyRate(a));
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function CampaignsClient({
  campaigns,
  canCreate,
  limit,
  currentCount,
  planLabel,
  overLimit,
}: {
  campaigns: Campaign[];
  senders: SenderInfo[];
  canCreate: boolean;
  limit: number;
  currentCount: number;
  planLabel: string;
  overLimit: boolean;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sortBy, setSortBy] = useState<CampaignSort>("date-desc");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isPending, startTransition] = useTransition();
  const summary = useMemo(() => buildSummary(campaigns), [campaigns]);
  const filtered = useMemo(() => filterCampaigns(campaigns, channel, status, search, sortBy), [campaigns, channel, search, sortBy, status]);
  const hasActiveFilters = channel !== "ALL" || status !== "ALL" || search.trim().length > 0;

  const channelData = [
    { channel: "Email", value: summary.email, fill: "#f97316" },
    { channel: "WhatsApp", value: summary.whatsapp, fill: "#22c55e" },
    { channel: "SMS", value: summary.sms, fill: "#71717a" },
  ].filter((item) => item.value > 0);

  const performanceData = campaigns
    .filter((campaign) => campaign.status === "SENT")
    .slice(0, 8)
    .map((campaign) => ({
      name: campaign.name.length > 12 ? `${campaign.name.slice(0, 12)}…` : campaign.name,
      sent: campaignSentCount(campaign),
      opened: campaign.channel === "WHATSAPP" ? campaign.whatsappAnalytics?.read ?? 0 : campaign.analytics?.totalOpened ?? 0,
      clicked: campaign.channel === "WHATSAPP" ? 0 : campaign.analytics?.totalClicked ?? 0,
      replied: campaign.channel === "WHATSAPP" ? campaign.whatsappAnalytics?.replied ?? 0 : 0,
    }));

  function runAction(action: "delete" | "cancel") {
    const id = action === "delete" ? deleteId : cancelId;
    if (!id) return;
    startTransition(async () => {
      if (action === "delete") await deleteCampaign(id);
      else await cancelCampaign(id);
      setDeleteId(null);
      setCancelId(null);
      router.refresh();
    });
  }

  return (
    <div className="page-stack app-shell-safe">
      {overLimit && limit !== -1 ? <LimitWarningBanner resourceLabel="campagnes actives" current={currentCount} limit={limit} planLabel={planLabel} /> : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Campagnes</h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Créez, retrouvez et pilotez vos campagnes email et WhatsApp.
          </p>
        </div>
        <Button asChild>
          <Link href={canCreate ? "/dashboard/campaigns/new" : "/dashboard/settings/billing"}>
            {canCreate ? <Plus className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {canCreate ? "Nouvelle campagne" : "Passer au Pro"}
          </Link>
        </Button>
      </div>

      <CompactKpiBar summary={summary} />

      <Card>
        <CampaignFilters search={search} status={status} sortBy={sortBy} channel={channel} onSearch={setSearch} onStatus={setStatus} onSort={(value) => setSortBy(value as CampaignSort)} onChannel={setChannel} />
        <CampaignTable
          campaigns={filtered}
          pending={isPending}
          hasActiveFilters={hasActiveFilters}
          canCreate={canCreate}
          onOpenDetail={setSelectedCampaign}
          onCancel={setCancelId}
          onDelete={setDeleteId}
        />
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-balance text-lg font-semibold text-zinc-950 dark:text-zinc-50">Analyse</h2>
          <p className="mt-1 text-pretty text-sm text-zinc-500 dark:text-zinc-400">
            Consultez les tendances une fois les campagnes envoyées.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.8fr)]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Performance par campagne</CardTitle>
              <CardDescription>Envois, ouvertures, clics email et réponses WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent>{performanceData.length ? <CampaignPerformanceChart data={performanceData} /> : <EmptyChart label="Les performances apparaîtront après les premiers envois." />}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Répartition par canal</CardTitle>
              <CardDescription>Poids email, WhatsApp et SMS dans vos campagnes.</CardDescription>
            </CardHeader>
            <CardContent>{channelData.length ? <CampaignChannelChart data={channelData} /> : <EmptyChart label="Aucune campagne créée." height="h-[220px]" />}</CardContent>
          </Card>
        </div>
      </section>

      <CampaignDetailSheet campaign={selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)} />
      <ConfirmCampaignAction type="delete" open={!!deleteId} pending={isPending} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={() => runAction("delete")} />
      <ConfirmCampaignAction type="cancel" open={!!cancelId} pending={isPending} onOpenChange={(open) => !open && setCancelId(null)} onConfirm={() => runAction("cancel")} />
    </div>
  );
}

function EmptyChart({ label, height = "h-[260px]" }: { label: string; height?: string }) {
  return <div className={`flex ${height} items-center justify-center text-center text-sm text-zinc-500`}>{label}</div>;
}

function CompactKpiBar({ summary }: { summary: ReturnType<typeof buildSummary> }) {
  const engagement = summary.sentVolume > 0
    ? ((summary.opened + summary.clickedOrReplied) / summary.sentVolume) * 100
    : 0;
  const items = [
    { label: "Total", value: formatNumber(summary.total), detail: `${formatNumber(summary.email)} email · ${formatNumber(summary.whatsapp)} WhatsApp`, icon: BarChart3 },
    { label: "Actives", value: formatNumber(summary.active), detail: `${formatNumber(summary.drafts)} brouillon${summary.drafts > 1 ? "s" : ""}`, icon: Clock3 },
    { label: "Envoyées", value: formatNumber(summary.sent), detail: `${formatNumber(summary.sentVolume)} envois`, icon: Send },
    { label: "Engagement", value: formatRate(engagement), detail: `${formatNumber(summary.opened)} lectures · ${formatNumber(summary.clickedOrReplied)} réponses`, icon: MousePointerClick },
  ];

  return (
    <div className="grid overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04)] sm:grid-cols-2 xl:grid-cols-4 dark:border-zinc-800 dark:bg-zinc-900/55">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex min-h-16 items-center gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0 dark:border-zinc-800">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.label}</p>
              <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
                <p className="font-mono text-lg font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{item.value}</p>
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CampaignFilters(props: {
  search: string;
  status: string;
  sortBy: CampaignSort;
  channel: string;
  onSearch: (value: string) => void;
  onStatus: (value: string) => void;
  onSort: (value: string) => void;
  onChannel: (value: string) => void;
}) {
  return (
    <CardHeader>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <CardTitle>Liste des campagnes</CardTitle>
          <CardDescription>Filtrez par canal, statut, nom ou performance.</CardDescription>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(12rem,1fr)_11rem_11rem]">
          <Input value={props.search} onChange={(event) => props.onSearch(event.target.value)} placeholder="Rechercher..." />
          <Select value={props.status} onValueChange={props.onStatus}>
            <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les statuts</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={props.sortBy} onValueChange={props.onSort}>
            <SelectTrigger><ArrowUpDown className="h-4 w-4" /><SelectValue /></SelectTrigger>
            <SelectContent>{sortOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <Tabs value={props.channel} onValueChange={props.onChannel}>
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="ALL">Tous les canaux</TabsTrigger>
          <TabsTrigger value="EMAIL" className="gap-2"><Mail className="h-4 w-4" />Email</TabsTrigger>
          <TabsTrigger value="WHATSAPP" className="gap-2"><MessageCircle className="h-4 w-4" />WhatsApp</TabsTrigger>
          <TabsTrigger value="SMS" className="gap-2"><Smartphone className="h-4 w-4" />SMS</TabsTrigger>
        </TabsList>
      </Tabs>
    </CardHeader>
  );
}

function CampaignTable({
  campaigns,
  pending,
  hasActiveFilters,
  canCreate,
  onOpenDetail,
  onCancel,
  onDelete,
}: {
  campaigns: Campaign[];
  pending: boolean;
  hasActiveFilters: boolean;
  canCreate: boolean;
  onOpenDetail: (campaign: Campaign) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <CardContent>
      <Table className="min-w-[960px]">
        <TableHeader>
          <TableRow>
            <TableHead>Campagne</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Prochaine action</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Audience</TableHead>
            <TableHead className="text-right">Ouverture/Lecture</TableHead>
            <TableHead className="text-right">Clic/Réponse</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-48 text-center">
                <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-600">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-950 dark:text-zinc-50">
                      {hasActiveFilters ? "Aucune campagne ne correspond aux filtres." : "Aucune campagne créée."}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {hasActiveFilters ? "Ajustez les filtres ou lancez une nouvelle campagne." : "Créez votre première campagne email ou WhatsApp pour suivre ses performances ici."}
                    </p>
                  </div>
                  {canCreate ? (
                    <Button asChild size="sm" className="min-h-10">
                      <Link href="/dashboard/campaigns/new">
                        <Plus className="h-4 w-4" />
                        Nouvelle campagne
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ) : campaigns.map((campaign) => (
            <TableRow
              key={campaign.id}
              className="cursor-pointer focus-within:bg-zinc-50 hover:bg-zinc-50 dark:focus-within:bg-zinc-900/60 dark:hover:bg-zinc-900/60"
              tabIndex={0}
              onClick={() => onOpenDetail(campaign)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenDetail(campaign);
                }
              }}
            >
              <TableCell>
                <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{campaign.name}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{campaign.channel === "EMAIL" ? campaign.subject || "Sans sujet" : campaign.previewText || "Message WhatsApp"}</p>
              </TableCell>
              <TableCell>
                <StatusBadge status={campaign.status} />
              </TableCell>
              <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <CampaignNextAction campaign={campaign} onOpenDetail={onOpenDetail} />
              </TableCell>
              <TableCell><ChannelBadge channel={campaign.channel} /></TableCell>
              <TableCell><span className="font-mono">{formatNumber(campaign._count?.recipients ?? 0)}</span><p className="mt-1 text-xs text-zinc-500">{campaign.contactList?.name ?? "Tous les contacts"}</p></TableCell>
              <TableCell className="text-right font-mono">{formatRate(getOpenRate(campaign))}</TableCell>
              <TableCell className="text-right font-mono">{formatRate(getClickOrReplyRate(campaign))}</TableCell>
              <TableCell onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <CampaignActions campaign={campaign} pending={pending} onCancel={onCancel} onDelete={onDelete} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  );
}

function CampaignNextAction({ campaign, onOpenDetail }: { campaign: Campaign; onOpenDetail: (campaign: Campaign) => void }) {
  if (campaign.status === "DRAFT") {
    const href = campaign.subject ? `/dashboard/campaigns/${campaign.id}/send` : `/dashboard/campaigns/${campaign.id}/edit`;
    const label = campaign.subject ? "Envoyer" : "Éditer";
    const Icon = campaign.subject ? Send : Edit;

    return (
      <Button asChild size="sm" variant={campaign.subject ? "default" : "outline"} className="min-h-10">
        <Link href={href}>
          <Icon className="h-4 w-4" />
          {label}
        </Link>
      </Button>
    );
  }

  if (campaign.status === "SENT") {
    return (
      <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={() => onOpenDetail(campaign)}>
        <BarChart3 className="h-4 w-4" />
        Analyser
      </Button>
    );
  }

  if (campaign.status === "SCHEDULED" || campaign.status === "SENDING") {
    return (
      <Button type="button" size="sm" variant="outline" className="min-h-10" onClick={() => onOpenDetail(campaign)}>
        <Clock3 className="h-4 w-4" />
        Suivre
      </Button>
    );
  }

  return (
    <Button asChild size="sm" variant="outline" className="min-h-10">
      <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
        <Edit className="h-4 w-4" />
        Reprendre
      </Link>
    </Button>
  );
}

function CampaignDetailSheet({ campaign, onOpenChange }: { campaign: Campaign | null; onOpenChange: (open: boolean) => void }) {
  const sentVolume = campaign ? campaignSentCount(campaign) : 0;
  const opened = campaign?.channel === "WHATSAPP" ? campaign.whatsappAnalytics?.read ?? 0 : campaign?.analytics?.totalOpened ?? 0;
  const clickedOrReplied = campaign?.channel === "WHATSAPP" ? campaign.whatsappAnalytics?.replied ?? 0 : campaign?.analytics?.totalClicked ?? 0;

  return (
    <Sheet open={!!campaign} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
        {campaign ? (
          <>
            <SheetHeader className="border-b border-zinc-200 px-5 py-5 pr-12 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <ChannelBadge channel={campaign.channel} />
                <StatusBadge status={campaign.status} />
              </div>
              <SheetTitle className="mt-3 text-xl">{campaign.name}</SheetTitle>
              <SheetDescription>
                {campaign.channel === "EMAIL" ? campaign.subject || "Sans sujet" : campaign.previewText || "Message WhatsApp"}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <DetailMetric label={campaign.channel === "WHATSAPP" ? "Lectures" : "Ouvertures"} value={formatNumber(opened)} icon={Eye} />
                <DetailMetric label={campaign.channel === "WHATSAPP" ? "Réponses" : "Clics"} value={formatNumber(clickedOrReplied)} icon={MousePointerClick} />
                <DetailMetric label="Volume envoyé" value={formatNumber(sentVolume)} icon={Send} />
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Résumé</h3>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <DetailRow label="Audience" value={`${formatNumber(campaign._count?.recipients ?? 0)} destinataire${(campaign._count?.recipients ?? 0) > 1 ? "s" : ""}`} />
                  <DetailRow label="Liste" value={campaign.contactList?.name ?? "Tous les contacts"} />
                  <DetailRow label="Taux ouverture/lecture" value={formatRate(getOpenRate(campaign))} />
                  <DetailRow label="Taux clic/réponse" value={formatRate(getClickOrReplyRate(campaign))} />
                </dl>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Chronologie</h3>
                <div className="space-y-2">
                  <TimelineItem icon={Clock3} label="Créée" value={formatDateTime(campaign.createdAt)} />
                  {campaign.scheduledAt ? <TimelineItem icon={CalendarClock} label="Planifiée" value={formatDateTime(campaign.scheduledAt)} /> : null}
                  {campaign.sentAt ? <TimelineItem icon={Send} label="Envoyée" value={formatDateTime(campaign.sentAt)} /> : null}
                  {campaign.completedAt ? <TimelineItem icon={CheckCircle2} label="Terminée" value={formatDateTime(campaign.completedAt)} /> : null}
                </div>
              </section>

              {campaign.channel === "EMAIL" ? (
                <section className="space-y-3">
                  <h3 className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Expéditeur</h3>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <DetailRow label="Nom" value={campaign.fromName ?? "Non défini"} />
                    <DetailRow label="Email" value={campaign.fromEmail ?? "Non défini"} />
                    <DetailRow label="Réponse à" value={campaign.replyTo ?? campaign.fromEmail ?? "Non défini"} />
                  </dl>
                </section>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-zinc-200 pt-5 sm:flex-row dark:border-zinc-800">
                <Button asChild className="min-h-11">
                  <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>Éditer</Link>
                </Button>
                <Button asChild variant="outline" className="min-h-11">
                  <Link href={`/dashboard/campaigns/${campaign.id}/send`}>Envoyer</Link>
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function DetailMetric({ label, value, icon: Icon }: { label: string; value: string; icon: ElementType }) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500">{label}</span>
        <Icon className="h-4 w-4 text-zinc-400" />
      </div>
      <p className="mt-2 font-mono text-lg font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900/70">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  );
}

function TimelineItem({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900/70">
      <Icon className="h-4 w-4 text-zinc-400" />
      <span className="font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
      <span className="ml-auto text-right text-zinc-500">{value}</span>
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ConfirmCampaignAction({ type, open, pending, onOpenChange, onConfirm }: { type: "delete" | "cancel"; open: boolean; pending: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  const isDelete = type === "delete";
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isDelete ? "Supprimer cette campagne ?" : "Annuler cette campagne ?"}</AlertDialogTitle>
          <AlertDialogDescription>{isDelete ? "Cette action supprimera définitivement la campagne sélectionnée." : "La campagne repassera en brouillon et ne sera plus planifiée."}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{isDelete ? "Annuler" : "Retour"}</AlertDialogCancel>
          <AlertDialogAction className={isDelete ? "bg-red-600 text-white hover:bg-red-500" : undefined} disabled={pending} onClick={onConfirm}>
            {isDelete ? "Supprimer" : "Annuler la campagne"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
