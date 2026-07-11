import Link from "next/link";
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, parse, startOfMonth, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Send } from "lucide-react";

import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { cn } from "@/lib/utils";
import { CalendarChannelChart, CalendarDayChart } from "./calendar-charts";
import { CampaignPill, ChannelBadge, StatusBadge } from "./calendar-ui";
import { formatNumber, type CalendarCampaign } from "./calendar-types";

const DAY_HEADERS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

async function getScheduledCampaigns(orgId: string, month: Date) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  const campaigns = await prisma.campaign.findMany({
    where: {
      organizationId: orgId,
      scheduledAt: { not: null, gte: monthStart, lte: monthEnd },
    },
    select: {
      id: true,
      name: true,
      subject: true,
      previewText: true,
      scheduledAt: true,
      sentAt: true,
      status: true,
      channel: true,
      contactList: { select: { name: true, contactCount: true } },
      _count: { select: { recipients: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return campaigns.map((campaign) => ({
    ...campaign,
    scheduledAt: campaign.scheduledAt?.toISOString() ?? new Date().toISOString(),
    sentAt: campaign.sentAt?.toISOString() ?? null,
  })) as CalendarCampaign[];
}

function getMonthParam(value?: string) {
  if (!value) return new Date();
  const parsed = parse(value, "yyyy-MM", new Date());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildSummary(campaigns: CalendarCampaign[]) {
  return campaigns.reduce(
    (acc, campaign) => {
      acc.total += 1;
      acc[campaign.channel.toLowerCase() as "email" | "whatsapp" | "sms"] += 1;
      acc.recipients += campaign._count.recipients;
      if (campaign.status === "SCHEDULED") acc.scheduled += 1;
      if (campaign.status === "SENDING") acc.sending += 1;
      if (campaign.status === "SENT") acc.sent += 1;
      return acc;
    },
    { total: 0, email: 0, whatsapp: 0, sms: 0, recipients: 0, scheduled: 0, sending: 0, sent: 0 },
  );
}

type PageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const currentMonth = getMonthParam(params.month);
  const ctx = await getCurrentUserAndOrg();
  const campaigns = ctx.org ? await getScheduledCampaigns(ctx.org.id, currentMonth) : [];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const summary = buildSummary(campaigns);
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: fr });
  const previousMonth = format(addMonths(currentMonth, -1), "yyyy-MM");
  const nextMonth = format(addMonths(currentMonth, 1), "yyyy-MM");
  const todayMonth = format(new Date(), "yyyy-MM");

  const channelData = [
    { channel: "Email", value: summary.email, fill: "#f97316" },
    { channel: "WhatsApp", value: summary.whatsapp, fill: "#22c55e" },
    { channel: "SMS", value: summary.sms, fill: "#71717a" },
  ].filter((item) => item.value > 0);

  const dayData = days
    .filter((day) => isSameMonth(day, currentMonth))
    .map((day) => {
      const dayCampaigns = campaigns.filter((campaign) => isSameDay(new Date(campaign.scheduledAt), day));
      return {
        day: format(day, "d"),
        email: dayCampaigns.filter((campaign) => campaign.channel === "EMAIL").length,
        whatsapp: dayCampaigns.filter((campaign) => campaign.channel === "WHATSAPP").length,
      };
    })
    .filter((item) => item.email + item.whatsapp > 0);

  return (
    <div className="page-stack app-shell-safe">
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Campagnes", href: "/dashboard/campaigns" }, { label: "Calendrier" }]} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Calendrier</h1>
          <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Planning mensuel des campagnes planifiées, avec canal, audience et statut d’envoi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" className="h-10">
            <Link href={`/dashboard/calendar?month=${previousMonth}`} aria-label="Mois précédent">
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-10">
            <Link href={`/dashboard/calendar?month=${todayMonth}`}>Aujourd’hui</Link>
          </Button>
          <Button asChild variant="outline" className="h-10">
            <Link href={`/dashboard/calendar?month=${nextMonth}`} aria-label="Mois suivant">
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild className="h-10">
            <Link href="/dashboard/campaigns/new">
              <Send className="h-4 w-4" />
              Nouvelle campagne
            </Link>
          </Button>
        </div>
      </div>

      <CompactCalendarMetrics summary={summary} currentMonth={currentMonth} />

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="capitalize">{monthLabel}</CardTitle>
            <CardDescription>Planning mensuel des campagnes.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="md:hidden">
            <MobileAgenda campaigns={campaigns} />
          </div>
          <div className="hidden overflow-hidden rounded-lg border md:block">
            <div className="grid grid-cols-7 border-b bg-zinc-50 dark:bg-zinc-900/60">
              {DAY_HEADERS.map((day) => (
                <div key={day} className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day) => {
                const dayCampaigns = campaigns.filter((campaign) => isSameDay(new Date(campaign.scheduledAt), day));
                const inMonth = isSameMonth(day, currentMonth);
                const today = isToday(day);

                return (
                  <div key={day.toISOString()} className={cn("min-h-32 border-b border-r p-2", !inMonth && "bg-zinc-50/70 text-zinc-400 dark:bg-zinc-950/30")}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs tabular-nums", today ? "bg-orange-600 font-medium text-white" : "text-zinc-700 dark:text-zinc-200")}>
                        {format(day, "d")}
                      </span>
                      {dayCampaigns.length ? <span className="font-mono text-[10px] text-zinc-500">{dayCampaigns.length}</span> : null}
                    </div>
                    <div className="space-y-1">
                      {dayCampaigns.slice(0, 3).map((campaign) => (
                        <CampaignPill key={campaign.id} campaign={campaign} />
                      ))}
                      {dayCampaigns.length > 3 ? (
                        <p className="px-1 text-[10px] text-zinc-500">+{dayCampaigns.length - 3} autre{dayCampaigns.length - 3 > 1 ? "s" : ""}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Campagnes du mois</CardTitle>
          <CardDescription>Canal, audience, statut et horaire d’envoi prévus.</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignTable campaigns={campaigns} />
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Analyse</h2>
          <p className="mt-1 text-pretty text-sm text-zinc-500 dark:text-zinc-400">
            Vue secondaire pour comprendre la charge du mois sans masquer le planning.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.8fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Charge par jour</CardTitle>
              <CardDescription>Nombre de campagnes planifiées sur le mois affiché.</CardDescription>
            </CardHeader>
            <CardContent>{dayData.length ? <CalendarDayChart data={dayData} /> : <EmptyChart label="Aucune charge planifiée sur ce mois." />}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Répartition par canal</CardTitle>
              <CardDescription>Email, WhatsApp et SMS dans le planning.</CardDescription>
            </CardHeader>
            <CardContent>{channelData.length ? <CalendarChannelChart data={channelData} /> : <EmptyChart label="Aucune campagne planifiée." height="h-[220px]" />}</CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function CompactCalendarMetrics({ summary, currentMonth }: { summary: ReturnType<typeof buildSummary>; currentMonth: Date }) {
  const metrics = [
    { label: "Planifiées", value: formatNumber(summary.total), hint: `${formatNumber(summary.email)} email · ${formatNumber(summary.whatsapp)} WhatsApp` },
    { label: "Audience", value: formatNumber(summary.recipients), hint: "destinataires" },
    { label: "En attente", value: formatNumber(summary.scheduled), hint: `${formatNumber(summary.sending)} en cours · ${formatNumber(summary.sent)} envoyées` },
    { label: "Mois", value: format(currentMonth, "LLLL", { locale: fr }), hint: format(currentMonth, "yyyy", { locale: fr }) },
  ];

  return (
    <Card>
      <CardContent className="grid gap-0 p-0 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="border-b border-zinc-200 px-4 py-3 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0 dark:border-zinc-800">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{metric.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="font-mono text-xl font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">{metric.value}</p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{metric.hint}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label, height = "h-[260px]" }: { label: string; height?: string }) {
  return <div className={`flex ${height} items-center justify-center text-center text-sm text-zinc-500`}>{label}</div>;
}

function MobileAgenda({ campaigns }: { campaigns: CalendarCampaign[] }) {
  if (!campaigns.length) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-zinc-500">
        <p className="font-medium text-zinc-700 dark:text-zinc-200">Aucune campagne planifiée pour ce mois.</p>
        <p className="mt-1 text-pretty">Planifiez une campagne email ou WhatsApp pour remplir ce calendrier.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((campaign) => (
        <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}/edit`} className="block rounded-lg border p-4 transition-[background-color,box-shadow] hover:bg-zinc-50 dark:hover:bg-zinc-900/70">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-zinc-950 dark:text-zinc-50">{campaign.name}</p>
              <p className="mt-1 text-xs text-zinc-500">{format(new Date(campaign.scheduledAt), "EEEE d MMMM à HH:mm", { locale: fr })}</p>
            </div>
            <ChannelBadge channel={campaign.channel} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function CampaignTable({ campaigns }: { campaigns: CalendarCampaign[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Campagne</TableHead>
          <TableHead>Canal</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Audience</TableHead>
          <TableHead className="text-right">Planifiée</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="h-28 text-center text-zinc-500">
              Aucune campagne planifiée sur ce mois. Créez une campagne, puis choisissez une date d’envoi.
            </TableCell>
          </TableRow>
        ) : campaigns.map((campaign) => (
          <TableRow key={campaign.id}>
            <TableCell>
              <Link href={`/dashboard/campaigns/${campaign.id}/edit`} className="font-medium text-zinc-950 transition-colors hover:text-orange-600 dark:text-zinc-50">
                {campaign.name}
              </Link>
              <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{campaign.subject || campaign.previewText || "Sans sujet"}</p>
            </TableCell>
            <TableCell><ChannelBadge channel={campaign.channel} /></TableCell>
            <TableCell><StatusBadge status={campaign.status} /></TableCell>
            <TableCell>
              <span className="font-mono">{formatNumber(campaign._count.recipients)}</span>
              <p className="mt-1 text-xs text-zinc-500">{campaign.contactList?.name ?? "Tous les contacts"}</p>
            </TableCell>
            <TableCell className="text-right font-mono">{format(new Date(campaign.scheduledAt), "d MMM · HH:mm", { locale: fr })}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
