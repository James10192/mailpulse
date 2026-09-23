"use client";

import { useState, useTransition } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateKeyDialog } from "@/components/dashboard/api-keys/create-key-dialog";
import { KeyNameEditor } from "@/components/dashboard/api-keys/key-name-editor";
import { NewKeySecretDialog } from "@/components/dashboard/api-keys/new-key-secret-dialog";
import { generateFilonIntegrationKey, renameFilonIntegrationKey, revokeFilonIntegrationKey } from "./actions";

type IntegrationKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
};

type ResourceStatus = {
  hasVerifiedDomain: boolean;
  mailpulseEmailAvailable: boolean;
  whatsappEnabled: boolean;
  whatsappMode: "BAILEYS" | "META";
  hasMetaConfig: boolean;
  hasBaileysConfig: boolean;
  mailpulseWhatsAppAvailable: boolean;
};

function FilonMark() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg shadow-sm">
      <svg viewBox="0 0 32 32" className="h-9 w-9" role="img" aria-label="Filon">
        <rect x="2" y="2" width="28" height="28" rx="8" fill="#4b3fcf" />
        <rect x="8.5" y="9" width="4.4" height="13" rx="2.2" fill="#ffffff" />
        <rect x="14.8" y="9" width="4.4" height="8" rx="2.2" fill="#ffffff" />
        <rect x="21.1" y="9" width="4.4" height="11" rx="2.2" fill="#ffffff" />
      </svg>
    </span>
  );
}

function ResourceItem({
  ok,
  title,
  description,
}: {
  ok: boolean;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      )}
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
    </div>
  );
}

export function IntegrationsClient({
  keys,
  endpointUrl,
  resourceStatus,
}: {
  keys: IntegrationKey[];
  endpointUrl: string;
  resourceStatus: ResourceStatus;
}) {
  const [secret, setSecret] = useState<{ value: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<IntegrationKey | null>(null);
  const [isPending, startTransition] = useTransition();

  async function create(data: FormData) {
    const result = await generateFilonIntegrationKey(data);
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
    const result = await renameFilonIntegrationKey(data);
    if ("error" in result && result.error) return result.error;
    toast.success("Clé renommée.");
    return null;
  }

  function revoke(key: IntegrationKey) {
    startTransition(async () => {
      const result = await revokeFilonIntegrationKey(key.id);
      if ("error" in result && result.error) toast.error(result.error);
      else toast.success(`Clé « ${key.name} » révoquée.`);
      setRevoking(null);
    });
  }

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copié.");
    } catch {
      toast.error("La copie a échoué.");
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div className="flex gap-3">
            <FilonMark />
            <div>
              <CardTitle>Filon</CardTitle>
              <CardDescription className="mt-1">
                Filon garde le cockpit commercial. MailPulse prépare l&apos;email,
                WhatsApp et le suivi communication.
              </CardDescription>
            </div>
          </div>
          <Badge variant={keys.length > 0 ? "success" : "filon"} className="shrink-0">
            <ShieldCheck className="h-3 w-3" />
            {keys.length > 0 ? "Connecté" : "À connecter"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Page d&apos;intégration MailPulse
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Gérez ici la clé Filon, les ressources email, WhatsApp et les limites visibles.
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <a href="/dashboard/settings/integrations">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ouvrir la page
                </a>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              Endpoint Filon
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              À coller dans Filon côté automatisation. Ce n&apos;est pas une page à ouvrir dans le navigateur.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {endpointUrl}
              </code>
              <Button variant="outline" size="sm" onClick={() => copy(endpointUrl)}>
                <Copy className="h-3.5 w-3.5" />
                Copier
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
            {keys.length === 0 ? (
              <div className="p-8 text-center">
                <KeyRound className="mx-auto h-6 w-6 text-zinc-400" />
                <p className="mt-2 text-sm text-zinc-500">Aucune clé Filon active.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Clé</TableHead>
                    <TableHead>Créée</TableHead>
                    <TableHead>Dernier usage</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="max-w-64">
                        <KeyNameEditor
                          name={key.name}
                          editing={editingId === key.id}
                          onEditingChange={(editing) => setEditingId(editing ? key.id : null)}
                          onRename={(name) => rename(key.id, name)}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{key.keyPrefix}</TableCell>
                      <TableCell>{new Date(key.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell>
                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleDateString("fr-FR") : "Jamais"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setRevoking(key)} disabled={isPending}>
                          <RotateCcw className="h-3.5 w-3.5" />
                          Révoquer
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <CreateKeyDialog
            title="Nouvelle clé Filon"
            description="Collez-la dans Filon. Elle ne sera affichée qu'une fois."
            triggerLabel="Générer une clé Filon"
            namePlaceholder="Ex. Filon production"
            onCreate={create}
          />
          <NewKeySecretDialog secret={secret?.value ?? null} keyName={secret?.name ?? ""} onClose={() => setSecret(null)} />
          <AlertDialog open={revoking !== null} onOpenChange={(open) => { if (!open) setRevoking(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Révoquer « {revoking?.name} » ?</AlertDialogTitle>
                <AlertDialogDescription>Filon ne pourra plus appeler MailPulse avec cette clé. Cette action est définitive.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isPending}>Annuler</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive hover:bg-destructive/90" disabled={isPending} onClick={(event) => { event.preventDefault(); if (revoking) revoke(revoking); }}>
                  Révoquer la clé
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ressources de relance</CardTitle>
          <CardDescription>
            Utilisez vos propres ressources quand elles sont prêtes. MailPulse peut prendre le relais avec des limites visibles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <ResourceItem
              ok={resourceStatus.hasVerifiedDomain}
              title="Domaine email vérifié"
              description={
                resourceStatus.hasVerifiedDomain
                  ? "Les emails Filon peuvent partir avec votre domaine."
                  : "Ajoutez SPF, DKIM et DMARC dans Envoi > Domaines pour protéger la délivrabilité."
              }
            />
            <ResourceItem
              ok={resourceStatus.mailpulseEmailAvailable}
              title="Domaine MailPulse disponible"
              description={
                resourceStatus.mailpulseEmailAvailable
                  ? "Fallback actif si votre domaine n'est pas encore prêt."
                  : "Fallback inactif. Configurez MAILPULSE_MANAGED_FROM_EMAIL côté plateforme."
              }
            />
            <ResourceItem
              ok={resourceStatus.whatsappEnabled && resourceStatus.hasMetaConfig && resourceStatus.whatsappMode === "META"}
              title="WhatsApp Meta Cloud API"
              description="Recommandé en production. Nécessite WABA, numéro, token et templates approuvés hors fenêtre 24h."
            />
            <ResourceItem
              ok={resourceStatus.whatsappEnabled && resourceStatus.hasBaileysConfig && resourceStatus.whatsappMode === "BAILEYS"}
              title="WhatsApp Web via QR code"
              description="Pratique pour démarrer. Non officiel, session fragile, risque de suspension en volume."
            />
            <ResourceItem
              ok={resourceStatus.mailpulseWhatsAppAvailable}
              title="Numéro WhatsApp MailPulse"
              description={
                resourceStatus.mailpulseWhatsAppAvailable
                  ? "Ressource plateforme disponible si le client n'a pas encore de numéro."
                  : "Indisponible pour le moment. Activez la ressource plateforme avant de la proposer."
              }
            />
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
