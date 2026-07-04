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
    <div className="overflow-hidden border-t">
      <Table className="w-full table-fixed">
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow>
            <TableHead className="w-[28%]">Destinataire</TableHead>
            <TableHead className="w-[20%]">Statut</TableHead>
            <TableHead className="w-[30%]">Erreur</TableHead>
            <TableHead className="w-[16%]">Créé</TableHead>
            <TableHead className="w-[6%] text-right">Voir</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {messages.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                Aucun message API pour le moment.
              </TableCell>
            </TableRow>
          ) : (
            messages.map((message) => (
              <TableRow key={message.id} className="align-middle">
                <TableCell>
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-mono text-xs">{message.recipient.value}</p>
                    <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      <span>{message.recipient.type}</span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate uppercase">{message.channel}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="min-w-0 space-y-1">
                    <Badge variant={messageStatusVariant(message.status)}>{message.status}</Badge>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {shortIdentifier(message.provider_message_id, 8, 5)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-2">
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
