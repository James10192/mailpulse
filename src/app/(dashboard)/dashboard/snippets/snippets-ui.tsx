"use client";

import Link from "next/link";
import { Check, Code2, Edit, Ellipsis, Eye, Mail, MessageCircle, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { channelLabels, type Snippet, type SnippetChannel } from "./snippets-types";

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

export function SnippetStatusBadge({ ready }: { ready: boolean }) {
  return (
    <Badge variant={ready ? "success" : "secondary"} className="whitespace-nowrap">
      {ready ? "Prêt" : "À compléter"}
    </Badge>
  );
}

export function SnippetActions({
  snippet,
  pending,
  copied,
  onPreview,
  onCopyText,
  onCopyHtml,
  onDelete,
}: {
  snippet: Snippet;
  pending: boolean;
  copied: "text" | "html" | null;
  onPreview: (snippet: Snippet) => void;
  onCopyText: (snippet: Snippet) => void;
  onCopyHtml: (snippet: Snippet) => void;
  onDelete: (snippet: Snippet) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button
        type="button"
        variant={copied === "text" ? "secondary" : "outline"}
        size="sm"
        disabled={pending}
        onClick={() => onCopyText(snippet)}
        className="min-h-10 min-w-[5.75rem]"
      >
        {copied === "text" ? <Check className="h-4 w-4" /> : null}
        {copied === "text" ? "Copié" : "Copier"}
      </Button>
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
          {snippet.channel === "EMAIL" ? (
            <DropdownMenuItem onSelect={() => onCopyHtml(snippet)}>
              {copied === "html" ? <Check className="h-4 w-4" /> : <Code2 className="h-4 w-4" />}
              {copied === "html" ? "HTML copié" : "Copier le HTML"}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => onDelete(snippet)} className="text-red-600 focus:text-red-600">
            <Trash2 className="h-4 w-4" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
