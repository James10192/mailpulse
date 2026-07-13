"use client";

import { AlertCircle, CheckCircle2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  formatMessageDate,
  messageErrorLabel,
  messageStatusVariant,
  shortIdentifier,
} from "./message-formatters";
import type { ApiMessageDetail } from "./message-types";
import { messageOriginLabel, messageOriginVariant } from "./message-origin";

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
      <Table className="min-w-[980px] table-fixed">
        <colgroup>
          <col className="w-[12rem]" />
          <col className="w-[5.5rem]" />
          <col className="w-[6.5rem]" />
          <col className="w-[12rem]" />
          <col className="w-[6.5rem]" />
          <col className="w-[9rem]" />
          <col className="w-[8rem]" />
          <col className="w-[4.5rem]" />
        </colgroup>
        <TableHeader className="sticky top-0 z-10 bg-card [&_tr]:border-zinc-200 dark:[&_tr]:border-zinc-800">
          <TableRow>
            <TableHead>Destinataire</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Origine</TableHead>
            <TableHead>Contenu</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Incident</TableHead>
            <TableHead>Créé</TableHead>
            <TableHead className="text-right">Détail</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-36 text-center text-sm text-muted-foreground">
                Aucune communication ne correspond à ces filtres.
              </TableCell>
            </TableRow>
          ) : (
            messages.map((message) => (
              <TableRow key={message.id} className="align-middle hover:bg-muted/45">
                <TableCell>
                  <div className="min-w-0 space-y-1">
                    <p className="max-w-48 truncate text-sm font-medium">{message.recipient.value}</p>
                    <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      <span>{message.recipient.type}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium uppercase text-muted-foreground">{message.channel}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={messageOriginVariant(message.origin)}>{messageOriginLabel(message.origin)}</Badge>
                </TableCell>
                <TableCell className="max-w-[12rem]">
                  <p className="truncate text-sm text-foreground" title={messagePreview(message)}>
                    {messagePreview(message)}
                  </p>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                    {shortIdentifier(message.provider_message_id, 8, 5)}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={messageStatusVariant(message.status)}>{message.status}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex max-w-44 min-w-0 items-center gap-2">
                    {message.error_code || message.error_message ? (
                      <AlertCircle className="size-4 shrink-0 text-destructive" />
                    ) : (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    )}
                    <span className="truncate text-xs text-muted-foreground">{messageErrorLabel(message)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <span className="block truncate">{formatMessageDate(message.created_at)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="ghost" size="icon" className="min-h-10 min-w-10" onClick={() => onSelect(message)} aria-label="Voir le détail de la communication">
                    <Eye className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
