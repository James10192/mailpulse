"use client";

import { ChevronRight, KeyRound, Mail, MessageCircle, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { messageContactLabel, messageStatusLabel, messageStatusVariant } from "./message-formatters";
import type { ApiMessageDetail } from "./message-types";
import { messageOriginLabel, messageOriginVariant } from "./message-origin";

const CHANNELS: Record<string, { label: string; icon: typeof Mail }> = {
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  sms: { label: "SMS", icon: Smartphone },
};

function messagePreview(message: ApiMessageDetail) {
  if (message.content.text) return message.content.text.replace(/\s+/g, " ").trim();
  if (message.template?.name) return `Modèle : ${message.template.name}`;
  if (message.content.template_key) return `Modèle : ${message.content.template_key}`;
  return "Contenu non renseigné";
}

export function MessageTable({
  messages,
  onSelect,
}: {
  messages: ApiMessageDetail[];
  onSelect: (message: ApiMessageDetail) => void;
}) {
  return (
    <div className="overflow-x-auto border-t border-zinc-200 dark:border-zinc-800">
      <Table className="min-w-[960px] table-fixed">
        <colgroup>
          <col className="w-[14rem]" />
          <col className="w-[7rem]" />
          <col className="w-[13rem]" />
          <col />
          <col className="w-[13rem]" />
          <col className="w-[8.5rem]" />
          <col className="w-[3.5rem]" />
        </colgroup>
        <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-zinc-200 dark:[&_tr]:border-zinc-800">
          <TableRow>
            <TableHead>Destinataire</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Envoyé par</TableHead>
            <TableHead>Contenu</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Date</TableHead>
            <TableHead><span className="sr-only">Détail</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-36 text-center text-sm text-muted-foreground">
                Aucun message ne correspond à ces filtres. Élargissez la période ou effacez les filtres.
              </TableCell>
            </TableRow>
          ) : (
            messages.map((message) => {
              const channel = CHANNELS[message.channel] ?? { label: message.channel, icon: Mail };
              const ChannelIcon = channel.icon;
              const error = message.error_message ?? message.error_code;
              const contact = message.contact ? messageContactLabel(message) : null;
              return (
                <TableRow key={message.id} className="cursor-pointer align-middle hover:bg-muted/45" onClick={() => onSelect(message)}>
                  <TableCell>
                    <p className="truncate text-sm font-medium" title={message.recipient.value}>{message.recipient.value}</p>
                    {contact && contact !== message.recipient.value ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{contact}</p> : null}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                      <ChannelIcon className="size-4" aria-hidden="true" />{channel.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    {message.api_key ? (
                      <span className="flex min-w-0 items-start gap-1.5 text-sm" title={message.api_key.revoked ? `${message.api_key.name} (clé révoquée depuis)` : message.api_key.name}>
                        <KeyRound className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="line-clamp-2 break-words">{message.api_key.name}</span>
                      </span>
                    ) : (
                      <Badge variant={messageOriginVariant(message.origin)}>{messageOriginLabel(message.origin)}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="truncate text-sm" title={messagePreview(message)}>{messagePreview(message)}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={messageStatusVariant(message.status)}>{messageStatusLabel(message.status)}</Badge>
                    {error ? <p className="mt-1 truncate text-xs text-destructive" title={error}>{error}</p> : null}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block truncate" suppressHydrationWarning>{formatRelativeTime(message.created_at)}</span>
                      </TooltipTrigger>
                      <TooltipContent>{formatDate(message.created_at)}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9"
                      onClick={(event) => { event.stopPropagation(); onSelect(message); }}
                      aria-label={`Voir le détail du message à ${message.recipient.value}`}
                    >
                      <ChevronRight aria-hidden="true" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
