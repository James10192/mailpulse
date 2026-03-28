import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  isSameDay,
} from "date-fns";
import { fr } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getScheduledCampaigns() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  return prisma.campaign.findMany({
    where: {
      scheduledAt: {
        not: null,
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      id: true,
      name: true,
      scheduledAt: true,
      status: true,
    },
    orderBy: { scheduledAt: "asc" },
  });
}

const DAY_HEADERS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export default async function CalendarPage() {
  const campaigns = await getScheduledCampaigns();
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const monthLabel = format(now, "MMMM yyyy", { locale: fr });

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Campagnes", href: "/dashboard/campaigns" }, { label: "Calendrier" }]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Calendrier</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Visualisez vos campagnes planifiees
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden">
        {/* Month header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <button className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">
            {monthLabel}
          </h2>
          <button className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {DAY_HEADERS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = isSameMonth(day, now);
            const today = isToday(day);
            const dayCampaigns = campaigns.filter(
              (c) => c.scheduledAt && isSameDay(new Date(c.scheduledAt), day)
            );

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[80px] p-2 border-b border-r border-zinc-100 dark:border-zinc-800/50 ${
                  !inMonth ? "bg-zinc-50/50 dark:bg-zinc-950/30" : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs tabular-nums ${
                      today
                        ? "flex items-center justify-center h-6 w-6 rounded-full bg-orange-600 text-white font-medium"
                        : inMonth
                          ? "text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                {dayCampaigns.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {dayCampaigns.slice(0, 2).map((campaign) => (
                      <div
                        key={campaign.id}
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-500/10"
                        title={campaign.name}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                        <span className="text-[10px] text-orange-700 dark:text-orange-400 truncate">
                          {campaign.name}
                        </span>
                      </div>
                    ))}
                    {dayCampaigns.length > 2 && (
                      <span className="text-[10px] text-zinc-500 px-1.5">
                        +{dayCampaigns.length - 2} autre{dayCampaigns.length - 2 > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming scheduled campaigns */}
      {campaigns.length > 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">
            Campagnes planifiees ce mois
          </h3>
          <div className="space-y-2">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-zinc-900 dark:text-zinc-100">{campaign.name}</span>
                </div>
                <span className="text-xs text-zinc-500">
                  {campaign.scheduledAt &&
                    format(new Date(campaign.scheduledAt), "d MMM a HH:mm", { locale: fr })}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-12 text-center">
          <CalendarDays className="h-8 w-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">Aucune campagne planifiee ce mois.</p>
        </div>
      )}
    </div>
  );
}
