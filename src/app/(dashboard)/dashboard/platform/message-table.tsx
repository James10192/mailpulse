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

export function MessageTable({
  messages,
  onSelect,
}: {
  messages: ApiMessageDetail[];
  onSelect: (message: ApiMessageDetail) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Destinataire</TableHead>
            <TableHead>Canal</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Provider</TableHead>
            <TableHead>Erreur</TableHead>
            <TableHead>Créé</TableHead>
            <TableHead className="w-16 text-right">Voir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                Aucun message API pour le moment.
              </TableCell>
            </TableRow>
          ) : (
            messages.map((message) => (
              <TableRow key={message.id} className="align-middle">
                <TableCell>
                  <div className="max-w-[13rem] space-y-1">
                    <p className="truncate font-mono text-xs">{message.recipient.value}</p>
                    <p className="text-xs text-muted-foreground">{message.recipient.type}</p>
                  </div>
                </TableCell>
                <TableCell className="uppercase">{message.channel}</TableCell>
                <TableCell>
                  <Badge variant={messageStatusVariant(message.status)}>{message.status}</Badge>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {shortIdentifier(message.provider_message_id, 8, 5)}
                </TableCell>
                <TableCell>
                  <div className="flex max-w-[12rem] items-center gap-2">
                    {message.error_code || message.error_message ? (
                      <AlertCircle className="size-4 shrink-0 text-destructive" />
                    ) : (
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    )}
                    <span className="truncate text-xs text-muted-foreground">{messageErrorLabel(message)}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatMessageDate(message.created_at)}
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" variant="ghost" size="icon" onClick={() => onSelect(message)} aria-label="Voir le message">
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
