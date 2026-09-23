"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound, ListFilter, MoreHorizontal, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CreateKeyDialog } from "@/components/dashboard/api-keys/create-key-dialog";
import { KeyNameEditor } from "@/components/dashboard/api-keys/key-name-editor";
import { NewKeySecretDialog } from "@/components/dashboard/api-keys/new-key-secret-dialog";
import { formatDate, formatRelativeTime } from "@/lib/utils";
import { generateMailPulseApiKey, renameMailPulseApiKey, revokeMailPulseApiKey, updateMailPulseApiKeySender } from "./actions";

export type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: "LIVE" | "TEST";
  defaultEmailSenderId: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  recentMessages: number;
};

type EmailSenderOption = { id: string; name: string; email: string; isDefault: boolean; verified: boolean };

const INHERIT = "inherit";

function SenderItem({ sender }: { sender: EmailSenderOption }) {
  return (
    <SelectItem value={sender.id} disabled={!sender.verified}>
      {sender.name} · {sender.email}{sender.verified ? "" : " (domaine non vérifié)"}
    </SelectItem>
  );
}

function Moment({ value, empty }: { value: string | null; empty: string }) {
  if (!value) return <span className="text-muted-foreground">{empty}</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default whitespace-nowrap" suppressHydrationWarning>{formatRelativeTime(value)}</span>
      </TooltipTrigger>
      <TooltipContent>{formatDate(value)}</TooltipContent>
    </Tooltip>
  );
}

export function ApiKeysPanel({ apiKeys, emailSenders, canManage = true }: { apiKeys: ApiKeyRow[]; emailSenders: EmailSenderOption[]; canManage?: boolean }) {
  const [secret, setSecret] = useState<{ value: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<ApiKeyRow | null>(null);
  const [showRevoked, setShowRevoked] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeKeys = apiKeys.filter((key) => !key.revokedAt);
  const revokedCount = apiKeys.length - activeKeys.length;
  const visibleKeys = showRevoked ? apiKeys : activeKeys;
  const defaultSenderId = emailSenders.find((sender) => sender.isDefault && sender.verified)?.id ?? INHERIT;

  async function create(data: FormData) {
    const result = await generateMailPulseApiKey(data);
    if ("key" in result && result.key) {
      setSecret({ value: result.key, name: String(data.get("name") ?? "").trim() });
      return {};
    }
    return { error: "error" in result ? result.error : "La clé n'a pas pu être créée." };
  }

  async function rename(keyId: string, name: string) {
    const data = new FormData();
    data.set("keyId", keyId);
    data.set("name", name);
    const result = await renameMailPulseApiKey(data);
    if ("error" in result && result.error) return result.error;
    toast.success("Clé renommée.");
    return null;
  }

  function revoke(key: ApiKeyRow) {
    const data = new FormData();
    data.set("keyId", key.id);
    startTransition(async () => {
      const result = await revokeMailPulseApiKey(data);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success(`Clé « ${key.name} » révoquée.`);
      setRevoking(null);
    });
  }

  function updateSender(keyId: string, senderId: string) {
    const data = new FormData();
    data.set("keyId", keyId);
    data.set("defaultEmailSenderId", senderId);
    startTransition(async () => {
      const result = await updateMailPulseApiKeySender(data);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success("Expéditeur de la clé mis à jour.");
    });
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <CardTitle>Clés API</CardTitle>
            <CardDescription>Une clé par application qui envoie des messages : son nom vous permet de suivre son trafic.</CardDescription>
          </div>
          <CreateKeyDialog
            title="Nouvelle clé API"
            description="La clé ne sera affichée qu'une fois, juste après sa création."
            triggerLabel="Nouvelle clé"
            namePlaceholder="Ex. Application mobile"
            disabled={!canManage}
            disabledReason="Disponible avec le plan Pro"
            onCreate={create}
          >
            <fieldset className="grid gap-2">
              <legend className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">Environnement</legend>
              <RadioGroup name="environment" defaultValue="LIVE" className="grid gap-2 sm:grid-cols-2">
                {([
                  ["LIVE", "Production", "Envoie de vrais messages."],
                  ["TEST", "Test", "Pour développer sans toucher vos contacts."],
                ] as const).map(([value, label, hint]) => (
                  <Label key={value} htmlFor={`env-${value}`} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 font-normal has-[[data-state=checked]]:border-orange-500/60 has-[[data-state=checked]]:bg-orange-500/5">
                    <RadioGroupItem id={`env-${value}`} value={value} className="mt-0.5" />
                    <span className="grid gap-1">
                      <span className="font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">{hint}</span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </fieldset>
            <div className="grid gap-2">
              <Label htmlFor="key-sender">Expéditeur des e-mails</Label>
              <Select name="defaultEmailSenderId" defaultValue={defaultSenderId}>
                <SelectTrigger id="key-sender" className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={INHERIT}>Expéditeur par défaut de l&apos;organisation</SelectItem>
                  {emailSenders.map((sender) => <SenderItem key={sender.id} sender={sender} />)}
                </SelectContent>
              </Select>
            </div>
          </CreateKeyDialog>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {visibleKeys.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <KeyRound className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Aucune clé active</p>
            <p className="max-w-sm text-sm text-muted-foreground">Créez une clé pour chaque application qui enverra des messages par l&apos;API. Nommez-la d&apos;après cette application.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[860px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Clé</TableHead>
                  <TableHead className="text-right">Messages, 30 j</TableHead>
                  <TableHead>Expéditeur</TableHead>
                  <TableHead>Dernier usage</TableHead>
                  <TableHead>Créée</TableHead>
                  <TableHead className="w-12"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleKeys.map((key) => {
                  const revoked = Boolean(key.revokedAt);
                  return (
                    <TableRow key={key.id} className={revoked ? "opacity-60" : undefined}>
                      <TableCell className="max-w-72">
                        <KeyNameEditor
                          name={key.name}
                          editing={editingId === key.id}
                          onEditingChange={(editing) => setEditingId(editing ? key.id : null)}
                          onRename={(name) => rename(key.id, name)}
                          disabled={!canManage}
                        />
                        <div className="mt-1 flex gap-1">
                          <Badge variant={key.environment === "LIVE" ? "default" : "secondary"}>{key.environment === "LIVE" ? "Production" : "Test"}</Badge>
                          {revoked ? <Badge variant="outline">Révoquée</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{key.keyPrefix}</TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/dashboard/platform?tab=messages&key=${key.id}`}
                          className="font-mono tabular-nums underline-offset-4 hover:text-orange-600 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/35"
                          aria-label={`Voir les ${key.recentMessages} messages de la clé ${key.name}`}
                        >
                          {key.recentMessages.toLocaleString("fr-FR")}
                        </Link>
                      </TableCell>
                      <TableCell className="min-w-56">
                        <Select value={key.defaultEmailSenderId ?? INHERIT} onValueChange={(value) => updateSender(key.id, value)} disabled={!canManage || isPending || revoked}>
                          <SelectTrigger className="h-9" aria-label={`Expéditeur de la clé ${key.name}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={INHERIT}>Expéditeur par défaut</SelectItem>
                            {emailSenders.map((sender) => <SenderItem key={sender.id} sender={sender} />)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm"><Moment value={key.lastUsedAt} empty="Jamais" /></TableCell>
                      <TableCell className="text-sm"><Moment value={key.createdAt} empty="—" /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon" className="size-9" aria-label={`Actions sur la clé ${key.name}`}>
                              <MoreHorizontal aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setEditingId(key.id)} disabled={!canManage}>
                              <Pencil aria-hidden="true" />Renommer
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/platform?tab=messages&key=${key.id}`}><ListFilter aria-hidden="true" />Voir ses messages</Link>
                            </DropdownMenuItem>
                            {revoked ? null : (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setRevoking(key)} disabled={!canManage}>
                                  <RotateCcw aria-hidden="true" />Révoquer
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {revokedCount > 0 ? (
          <div className="flex items-center gap-2 border-t px-5 py-3">
            <Switch id="show-revoked" checked={showRevoked} onCheckedChange={setShowRevoked} />
            <Label htmlFor="show-revoked" className="font-normal text-muted-foreground">
              Afficher les clés révoquées ({revokedCount})
            </Label>
          </div>
        ) : null}
      </CardContent>

      <AlertDialog open={revoking !== null} onOpenChange={(open) => { if (!open) setRevoking(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer « {revoking?.name} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              L&apos;application qui utilise cette clé ne pourra plus envoyer de messages. Ses messages passés restent dans le registre. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" disabled={isPending} onClick={(event) => { event.preventDefault(); if (revoking) revoke(revoking); }}>
              Révoquer la clé
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <NewKeySecretDialog secret={secret?.value ?? null} keyName={secret?.name ?? ""} onClose={() => setSecret(null)} />
    </Card>
  );
}
