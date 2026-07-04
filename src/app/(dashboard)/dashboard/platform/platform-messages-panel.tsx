"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageDetailSheet } from "./message-detail-sheet";
import { MessageTable } from "./message-table";
import type { ApiMessageDetail } from "./message-types";

export function PlatformMessagesPanel({ messages }: { messages: ApiMessageDetail[] }) {
  const [selectedMessage, setSelectedMessage] = useState<ApiMessageDetail | null>(null);

  return (
    <>
      <Card className="flex max-h-[34rem] min-h-0 flex-col overflow-hidden">
        <CardHeader className="shrink-0">
          <CardTitle>Messages API récents</CardTitle>
          <CardDescription>Destinataires, statuts provider, erreurs, IDs et webhooks sortants.</CardDescription>
        </CardHeader>
        <CardContent className="min-h-0 overflow-y-auto px-0 pb-0">
          <MessageTable messages={messages} onSelect={setSelectedMessage} />
        </CardContent>
      </Card>
      <MessageDetailSheet
        message={selectedMessage}
        onOpenChange={(open) => {
          if (!open) setSelectedMessage(null);
        }}
      />
    </>
  );
}

export type { ApiMessageDetail } from "./message-types";
