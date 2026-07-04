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
      <Card>
        <CardHeader>
          <CardTitle>Messages API récents</CardTitle>
          <CardDescription>Destinataires, statuts provider, erreurs, IDs et webhooks sortants.</CardDescription>
        </CardHeader>
        <CardContent>
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
