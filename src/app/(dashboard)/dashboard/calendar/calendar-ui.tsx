import Link from "next/link";
import type { ElementType } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Mail, MessageCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  channelLabels,
  statusLabels,
  type CalendarCampaign,
  type CalendarCampaignChannel,
  type CalendarCampaignStatus,
} from "./calendar-types";

const statusVariants: Record<CalendarCampaignStatus, "default" | "secondary" | "outline" | "success" | "warning" | "destructive"> = {
  DRAFT: "outline",
  SCHEDULED: "warning",
  SENDING: "default",
  SENT: "success",
  PAUSED: "secondary",
  CANCELLED: "destructive",
};

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  icon: ElementType;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-2 font-mono text-2xl">{value}</CardTitle>
        </div>
        <Icon className="h-5 w-5 shrink-0 text-zinc-400" />
      </CardHeader>
      <CardContent>
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">{description}</p>
      </CardContent>
    </Card>
  );
}

export function ChannelBadge({ channel }: { channel: CalendarCampaignChannel }) {
  const variant = channel === "WHATSAPP" ? "success" : channel === "SMS" ? "secondary" : "default";
  const Icon = channel === "WHATSAPP" ? MessageCircle : Mail;

  return (
    <Badge variant={variant} className="gap-1.5">
      <Icon className="h-3 w-3" />
      {channelLabels[channel]}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: CalendarCampaignStatus }) {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>;
}

export function CampaignPill({ campaign, compact = false }: { campaign: CalendarCampaign; compact?: boolean }) {
  return (
    <Link
      href={`/dashboard/campaigns/${campaign.id}/edit`}
      className={cn(
        "block rounded-md border border-orange-500/15 bg-orange-500/10 px-2 py-1 text-orange-700 transition-colors hover:bg-orange-500/15 dark:text-orange-300",
        compact && "px-1.5 py-0.5",
      )}
      title={campaign.name}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
        <span className="truncate text-[11px] font-medium">{campaign.name}</span>
      </span>
      {!compact ? (
        <span className="mt-0.5 block font-mono text-[10px] text-orange-700/70 dark:text-orange-300/70">
          {format(new Date(campaign.scheduledAt), "HH:mm", { locale: fr })}
        </span>
      ) : null}
    </Link>
  );
}
