"use client";

import Link from "next/link";
import type { ElementType } from "react";
import { Edit, Ellipsis, Eye, Mail, MessageCircle, Trash2 } from "lucide-react";

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
import { channelLabels, type Snippet, type SnippetChannel } from "./snippets-types";

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

export function ChannelBadge({ channel }: { channel: SnippetChannel }) {
  const variant = channel === "WHATSAPP" ? "success" : channel === "SMS" ? "secondary" : "default";
  const Icon = channel === "WHATSAPP" ? MessageCircle : Mail;

  return (
    <Badge variant={variant} className="gap-1.5">
      <Icon className="h-3 w-3" />
      {channelLabels[channel]}
    </Badge>
  );
}

export function SnippetActions({
  snippet,
  pending,
  onPreview,
  onDelete,
}: {
  snippet: Snippet;
  pending: boolean;
  onPreview: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending} aria-label="Actions snippet">
          <Ellipsis className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onPreview(snippet)}>
          <Eye className="h-4 w-4" />
          Prévisualiser
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/snippets/${snippet.id}/edit`}>
            <Edit className="h-4 w-4" />
            Éditer
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onDelete(snippet)} className="text-red-600 focus:text-red-600">
          <Trash2 className="h-4 w-4" />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
