"use client";

import Link from "next/link";
import { Edit, Ellipsis, Send, Trash2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { channelLabels, statusLabels, type Campaign, type CampaignChannel, type CampaignStatus } from "./campaigns-types";

const statusVariants: Record<CampaignStatus, "default" | "secondary" | "outline" | "success" | "warning" | "destructive"> = {
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
  icon: React.ElementType;
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

export function ChannelBadge({ channel }: { channel: CampaignChannel }) {
  const variant = channel === "WHATSAPP" ? "success" : channel === "SMS" ? "secondary" : "default";
  return <Badge variant={variant}>{channelLabels[channel]}</Badge>;
}

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>;
}

export function CampaignActions({
  campaign,
  pending,
  onCancel,
  onDelete,
}: {
  campaign: Campaign;
  pending: boolean;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label="Actions campagne">
          <Ellipsis className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
            <Edit className="h-4 w-4" />
            Éditer
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/campaigns/${campaign.id}/send`}>
            <Send className="h-4 w-4" />
            Envoyer
          </Link>
        </DropdownMenuItem>
        {campaign.status === "SCHEDULED" || campaign.status === "SENDING" ? (
          <DropdownMenuItem onSelect={() => onCancel(campaign.id)}>
            <XCircle className="h-4 w-4" />
            Annuler
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onDelete(campaign.id)} className="text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
