"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { generateMailPulseApiKey, revokeMailPulseApiKey } from "./actions";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: "LIVE" | "TEST";
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

export function ApiKeysPanel({ apiKeys }: { apiKeys: ApiKeyRow[] }) {
  const [revealedKey, setRevealedKey] = useState("");
  const [isPending, startTransition] = useTransition();

  function generate(environment: "LIVE" | "TEST") {
    const data = new FormData();
    data.set("environment", environment);
    startTransition(async () => {
      const result = await generateMailPulseApiKey(data);
      if (result && "key" in result && result.key) setRevealedKey(result.key);
    });
  }

  function revoke(keyId: string) {
    const data = new FormData();
    data.set("keyId", keyId);
    startTransition(async () => {
      await revokeMailPulseApiKey(data);
    });
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Clés génériques par tenant pour l’API publique MailPulse V1.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => generate("TEST")} disabled={isPending}>
            <KeyRound className="h-4 w-4" />
            Test
          </Button>
          <Button type="button" size="sm" onClick={() => generate("LIVE")} disabled={isPending}>
            <KeyRound className="h-4 w-4" />
            Live
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {revealedKey && (
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Nouvelle clé créée</p>
            <p className="mt-1 text-xs text-zinc-500">Copiez-la maintenant. Elle ne sera plus affichée ensuite.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-orange-500/20 bg-white px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                {revealedKey}
              </code>
              <Button size="sm" onClick={() => copy(revealedKey)}>
                <Copy className="h-3.5 w-3.5" />
                Copier
              </Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Clé</TableHead>
              <TableHead>Env</TableHead>
              <TableHead>Dernier usage</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-zinc-500">
                  Aucune clé MailPulse active.
                </TableCell>
              </TableRow>
            ) : (
              apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.name}</TableCell>
                  <TableCell className="font-mono text-xs">{key.keyPrefix}</TableCell>
                  <TableCell>
                    <Badge variant={key.environment === "LIVE" ? "default" : "secondary"}>{key.environment}</Badge>
                  </TableCell>
                  <TableCell>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString("fr-FR") : "Jamais"}</TableCell>
                  <TableCell className="text-right">
                    <Button type="button" variant="outline" size="sm" onClick={() => revoke(key.id)} disabled={isPending}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Révoquer
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
