"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpDown,
  BarChart3,
  Mail,
  MessageCircle,
  MousePointerClick,
  Plus,
  Send,
  Sparkles,
  Users,
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
import { CampaignActions, ChannelBadge, MetricCard, StatusBadge } from "./campaigns-ui";

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
  const [isPending, startTransition] = useTransition();
  const summary = useMemo(() => buildSummary(campaigns), [campaigns]);
  const filtered = useMemo(() => filterCampaigns(campaigns, channel, status, search, sortBy), [campaigns, channel, search, sortBy, status]);

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
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Campagnes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Pilotage des campagnes email et WhatsApp, avec performance, audience et état d’envoi.
          </p>
        </div>
        <Button asChild>
          <Link href={canCreate ? "/dashboard/campaigns/new" : "/dashboard/settings/billing"}>
            {canCreate ? <Plus className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {canCreate ? "Nouvelle campagne" : "Passer au Pro"}
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Campagnes" value={formatNumber(summary.total)} description={`${formatNumber(summary.email)} email · ${formatNumber(summary.whatsapp)} WhatsApp · ${formatNumber(summary.active)} actives`} icon={BarChart3} />
        <MetricCard label="Volume envoyé" value={formatNumber(summary.sentVolume)} description={`${formatNumber(summary.sent)} terminées · ${formatNumber(summary.drafts)} brouillons`} icon={Send} />
        <MetricCard label="Audience cumulée" value={formatNumber(summary.recipients)} description="Total des destinataires associés aux campagnes listées." icon={Users} />
        <MetricCard label="Engagement" value={formatRate(summary.sentVolume > 0 ? ((summary.opened + summary.clickedOrReplied) / summary.sentVolume) * 100 : 0)} description={`${formatNumber(summary.opened)} ouvertures ou lectures · ${formatNumber(summary.clickedOrReplied)} clics ou réponses`} icon={MousePointerClick} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Performance par campagne</CardTitle>
            <CardDescription>Envois, ouvertures, clics email et réponses WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>{performanceData.length ? <CampaignPerformanceChart data={performanceData} /> : <EmptyChart label="Les performances apparaîtront après les premiers envois." />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition par canal</CardTitle>
            <CardDescription>Lecture immédiate du poids email et WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>{channelData.length ? <CampaignChannelChart data={channelData} /> : <EmptyChart label="Aucune campagne créée." height="h-[220px]" />}</CardContent>
        </Card>
      </div>

      <Card>
        <CampaignFilters search={search} status={status} sortBy={sortBy} channel={channel} onSearch={setSearch} onStatus={setStatus} onSort={(value) => setSortBy(value as CampaignSort)} onChannel={setChannel} />
        <CampaignTable campaigns={filtered} pending={isPending} onCancel={setCancelId} onDelete={setDeleteId} />
      </Card>

      <ConfirmCampaignAction type="delete" open={!!deleteId} pending={isPending} onOpenChange={(open) => !open && setDeleteId(null)} onConfirm={() => runAction("delete")} />
      <ConfirmCampaignAction type="cancel" open={!!cancelId} pending={isPending} onOpenChange={(open) => !open && setCancelId(null)} onConfirm={() => runAction("cancel")} />
    </div>
  );
}

function EmptyChart({ label, height = "h-[260px]" }: { label: string; height?: string }) {
  return <div className={`flex ${height} items-center justify-center text-center text-sm text-zinc-500`}>{label}</div>;
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
        </TabsList>
      </Tabs>
    </CardHeader>
  );
}

function CampaignTable({ campaigns, pending, onCancel, onDelete }: { campaigns: Campaign[]; pending: boolean; onCancel: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campagne</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Audience</TableHead>
            <TableHead className="text-right">Ouverture/Lecture</TableHead>
            <TableHead className="text-right">Clic/Réponse</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="h-28 text-center text-zinc-500">Aucune campagne ne correspond aux filtres.</TableCell></TableRow>
          ) : campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell>
                <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{campaign.name}</p>
                <p className="mt-1 truncate text-xs text-zinc-500">{campaign.channel === "EMAIL" ? campaign.subject || "Sans sujet" : campaign.previewText || "Message WhatsApp"}</p>
              </TableCell>
              <TableCell><ChannelBadge channel={campaign.channel} /></TableCell>
              <TableCell><StatusBadge status={campaign.status} /></TableCell>
              <TableCell><span className="font-mono">{formatNumber(campaign._count?.recipients ?? 0)}</span><p className="mt-1 text-xs text-zinc-500">{campaign.contactList?.name ?? "Tous les contacts"}</p></TableCell>
              <TableCell className="text-right font-mono">{formatRate(getOpenRate(campaign))}</TableCell>
              <TableCell className="text-right font-mono">{formatRate(getClickOrReplyRate(campaign))}</TableCell>
              <TableCell><CampaignActions campaign={campaign} pending={pending} onCancel={onCancel} onDelete={onDelete} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  );
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
