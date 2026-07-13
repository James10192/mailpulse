"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { generateMailPulseApiKey, revokeMailPulseApiKey, updateMailPulseApiKeySender } from "./actions";

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: "LIVE" | "TEST";
  defaultEmailSenderId: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

type EmailSenderOption = { id: string; name: string; email: string; isDefault: boolean };
type Feedback = { tone: "success" | "error"; message: string } | null;

const dateFormatter = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

export function ApiKeysPanel({ apiKeys, emailSenders }: { apiKeys: ApiKeyRow[]; emailSenders: EmailSenderOption[] }) {
  const [revealedKey, setRevealedKey] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [selectedSenderId, setSelectedSenderId] = useState(emailSenders.find((sender) => sender.isDefault)?.id ?? emailSenders[0]?.id ?? "inherit");
  const [isPending, startTransition] = useTransition();

  function generate(environment: "LIVE" | "TEST") {
    const data = new FormData();
    data.set("environment", environment);
    data.set("defaultEmailSenderId", selectedSenderId);
    startTransition(async () => {
      const result = await generateMailPulseApiKey(data);
      if ("key" in result && result.key) {
        setRevealedKey(result.key);
        setFeedback({ tone: "success", message: "Clé créée. Copiez-la maintenant : elle ne sera plus affichée ensuite." });
      } else if ("error" in result && result.error) {
        setFeedback({ tone: "error", message: result.error });
      }
    });
  }

  function revoke(keyId: string) {
    const data = new FormData();
    data.set("keyId", keyId);
    startTransition(async () => {
      const result = await revokeMailPulseApiKey(data);
      setFeedback("error" in result && result.error ? { tone: "error", message: result.error } : { tone: "success", message: "Clé API révoquée." });
    });
  }

  function updateSender(keyId: string, defaultEmailSenderId: string) {
    const data = new FormData();
    data.set("keyId", keyId);
    data.set("defaultEmailSenderId", defaultEmailSenderId);
    startTransition(async () => {
      const result = await updateMailPulseApiKeySender(data);
      setFeedback("error" in result && result.error ? { tone: "error", message: result.error } : { tone: "success", message: "Expéditeur API mis à jour." });
    });
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ tone: "success", message: "Clé copiée." });
    } catch {
      setFeedback({ tone: "error", message: "La copie a échoué. Réessayez depuis un contexte sécurisé." });
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4 border-b">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div><CardTitle>Clés API</CardTitle><CardDescription>Clés par organisation pour l’API publique MailPulse.</CardDescription></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="h-10" onClick={() => generate("TEST")} disabled={isPending}><KeyRound aria-hidden="true" />Créer une clé test</Button>
            <Button type="button" className="h-10" onClick={() => generate("LIVE")} disabled={isPending}><KeyRound aria-hidden="true" />Créer une clé production</Button>
          </div>
        </div>
        <div className="max-w-md"><Select value={selectedSenderId} onValueChange={setSelectedSenderId} disabled={isPending || emailSenders.length === 0}><SelectTrigger className="h-10"><SelectValue placeholder="Expéditeur API par défaut" /></SelectTrigger><SelectContent>{emailSenders.length === 0 ? <SelectItem value="inherit">Aucun expéditeur vérifié</SelectItem> : emailSenders.map((sender) => <SelectItem key={sender.id} value={sender.id}>{sender.name} · {sender.email}</SelectItem>)}</SelectContent></Select></div>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        {feedback ? <Alert variant={feedback.tone === "error" ? "destructive" : "default"} className="mx-5 mt-5"><AlertDescription>{feedback.message}</AlertDescription></Alert> : null}
        {revealedKey ? <div className="mx-5 rounded-lg border border-orange-500/20 bg-orange-500/5 p-4"><p className="text-sm font-medium">Nouvelle clé</p><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"><code className="min-w-0 flex-1 overflow-x-auto rounded-md bg-background px-3 py-2 font-mono text-xs shadow-[inset_0_0_0_1px_rgba(24,24,27,0.1)]">{revealedKey}</code><Button type="button" variant="outline" className="h-10" onClick={() => copy(revealedKey)}><Copy aria-hidden="true" />Copier</Button></div></div> : null}
        <div className="overflow-x-auto border-t"><Table className="min-w-[760px]"><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Clé</TableHead><TableHead>Environnement</TableHead><TableHead>Expéditeur</TableHead><TableHead>Dernier usage</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader><TableBody>{apiKeys.length === 0 ? <TableRow><TableCell colSpan={6} className="h-32 text-center text-sm text-muted-foreground">Aucune clé API créée.</TableCell></TableRow> : apiKeys.map((key) => <TableRow key={key.id}><TableCell className="font-medium">{key.name}</TableCell><TableCell className="font-mono text-xs">{key.keyPrefix}</TableCell><TableCell><Badge variant={key.environment === "LIVE" ? "default" : "secondary"}>{key.environment === "LIVE" ? "Production" : "Test"}</Badge></TableCell><TableCell className="min-w-56"><Select value={key.defaultEmailSenderId ?? "inherit"} onValueChange={(value) => updateSender(key.id, value)} disabled={isPending || Boolean(key.revokedAt)}><SelectTrigger className="h-10"><SelectValue placeholder="Expéditeur par défaut" /></SelectTrigger><SelectContent><SelectItem value="inherit">Expéditeur par défaut</SelectItem>{emailSenders.map((sender) => <SelectItem key={sender.id} value={sender.id}>{sender.name} · {sender.email}</SelectItem>)}</SelectContent></Select></TableCell><TableCell className="text-sm text-muted-foreground">{key.lastUsedAt ? dateFormatter.format(new Date(key.lastUsedAt)) : "Jamais"}</TableCell><TableCell className="text-right">{key.revokedAt ? <Badge variant="secondary">Révoquée</Badge> : <AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="outline" className="h-10" disabled={isPending}><RotateCcw aria-hidden="true" />Révoquer</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Révoquer cette clé ?</AlertDialogTitle><AlertDialogDescription>Les intégrations qui l’utilisent ne pourront plus appeler l’API. Cette action ne peut pas être annulée.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => revoke(key.id)}>Révoquer la clé</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}</TableCell></TableRow>)}</TableBody></Table></div>
      </CardContent>
    </Card>
  );
}
