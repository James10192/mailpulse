"use client";

import { useState } from "react";
import { CheckCircle2, Copy, KeyRound, PlugZap, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { generateFilonIntegrationKey, revokeFilonIntegrationKey } from "./actions";

type IntegrationKey = {
  id: string;
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
    <div className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      {ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : (
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      )}
      <div>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
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
  const [revealedKey, setRevealedKey] = useState("");
  const [pending, setPending] = useState(false);

  async function generate() {
    setPending(true);
    const result = await generateFilonIntegrationKey();
    setPending(false);
    if ("key" in result && result.key) setRevealedKey(result.key);
  }

  async function revoke(id: string) {
    setPending(true);
    await revokeFilonIntegrationKey(id);
    setPending(false);
    if (revealedKey) setRevealedKey("");
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <div className="page-stack app-shell-safe max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Integrations</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Connectez Filon a MailPulse pour preparer les relances de recouvrement.
        </p>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <PlugZap className="h-4 w-4" />
                </span>
                Filon Recovery
              </CardTitle>
              <CardDescription>
                Filon garde le cockpit commercial. MailPulse prepare l&apos;email, WhatsApp et le suivi communication.
              </CardDescription>
            </div>
            <Badge variant={keys.length > 0 ? "success" : "filon"}>
              <ShieldCheck className="h-3 w-3" />
              {keys.length > 0 ? "Pret" : "A connecter"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-300">
              Endpoint Filon
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <code className="flex-1 overflow-x-auto rounded-md bg-white px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
                {endpointUrl}
              </code>
              <Button variant="outline" size="sm" onClick={() => copy(endpointUrl)}>
                <Copy className="h-3.5 w-3.5" />
                Copier
              </Button>
            </div>
          </div>

          {revealedKey && (
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Nouvelle cle creee</p>
              <p className="mt-1 text-xs text-zinc-500">Copiez-la maintenant. MailPulse ne l&apos;affichera plus ensuite.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="flex-1 overflow-x-auto rounded-md bg-white px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  {revealedKey}
                </code>
                <Button size="sm" onClick={() => copy(revealedKey)}>
                  <Copy className="h-3.5 w-3.5" />
                  Copier
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {keys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
                <KeyRound className="mx-auto h-6 w-6 text-zinc-400" />
                <p className="mt-2 text-sm text-zinc-500">Aucune cle Filon active.</p>
              </div>
            ) : (
              keys.map((key) => (
                <div key={key.id} className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-sm text-zinc-900 dark:text-zinc-100">{key.keyPrefix}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Creee le {new Date(key.createdAt).toLocaleDateString("fr-FR")}
                      {key.lastUsedAt ? ` · utilisee le ${new Date(key.lastUsedAt).toLocaleDateString("fr-FR")}` : " · jamais utilisee"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => revoke(key.id)} disabled={pending}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Revoquer
                  </Button>
                </div>
              ))
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Ressources de relance</p>
              <p className="mt-1 text-xs text-zinc-500">
                Utilisez vos propres ressources quand elles sont prêtes. MailPulse peut prendre le relais avec des limites visibles.
              </p>
            </div>
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
                title="Numero WhatsApp MailPulse"
                description={
                  resourceStatus.mailpulseWhatsAppAvailable
                    ? "Ressource plateforme disponible si le client n'a pas encore de numéro."
                    : "Indisponible pour le moment. Activez la ressource plateforme avant de la proposer."
                }
              />
            </div>
          </div>

          <Button onClick={generate} disabled={pending}>
            <KeyRound className="h-4 w-4" />
            Generer une cle Filon
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
