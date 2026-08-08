"use client";

import { useState } from "react";
import { Power, PowerOff } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { deactivateApplication, reactivateApplication } from "./actions";
import { CredentialsSection } from "./credentials-section";
import { ForwardEndpointsSection } from "./forward-endpoints-section";
import { InboundTokenSection } from "./inbound-token-section";
import { ProviderAccountSection } from "./provider-account-section";
import { TemplateConfigsSection } from "./template-configs-section";
import type { ApplicationView } from "./types";

export function ApplicationCard({ application, canManage }: { application: ApplicationView; canManage: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  // The inbound token only authenticates the Evolution webhook, so it stays
  // hidden until a Baileys account exists on the application.
  const hasBaileysAccount = application.providerAccounts.some((account) => account.transport === "BAILEYS");

  async function setActive(active: boolean) {
    setError("");
    setPending(true);
    const result = active
      ? await reactivateApplication(application.id)
      : await deactivateApplication(application.id);
    setPending(false);
    if ("error" in result && result.error) setError(result.error);
  }

  return (
    <Card className={application.active ? undefined : "opacity-80"}>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="truncate">{application.name}</CardTitle>
            <Badge variant={application.active ? "success" : "secondary"}>
              {application.active ? "Active" : "Désactivée"}
            </Badge>
            <Badge variant="outline">
              {application.activeCredentialCount} credential{application.activeCredentialCount > 1 ? "s" : ""} actif
              {application.activeCredentialCount > 1 ? "s" : ""}
            </Badge>
          </div>
          <CardDescription className="mt-1 font-mono text-xs">
            {application.key} · créée le {new Date(application.createdAt).toLocaleDateString("fr-FR")}
          </CardDescription>
        </div>
        {canManage ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={pending} className="shrink-0">
                {application.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                {application.active ? "Désactiver" : "Réactiver"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {application.active
                    ? `Désactiver ${application.name} ?`
                    : `Réactiver ${application.name} ?`}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {application.active
                    ? "Les commandes entrantes de cette application seront refusées. Aucune donnée n'est supprimée : vous pourrez la réactiver à tout moment."
                    : "Les commandes entrantes de cette application seront de nouveau acceptées."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  className={application.active ? "bg-red-600 hover:bg-red-500" : undefined}
                  onClick={() => setActive(!application.active)}
                >
                  {application.active ? "Désactiver" : "Réactiver"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <CredentialsSection
          applicationId={application.id}
          credentials={application.credentials}
          canManage={canManage}
        />
        <Separator />
        <ProviderAccountSection
          applicationId={application.id}
          accounts={application.providerAccounts}
          activeTransport={application.activeTransport}
          canManage={canManage}
        />
        {hasBaileysAccount ? (
          <>
            <Separator />
            <InboundTokenSection
              applicationId={application.id}
              tokens={application.inboundTokens}
              canManage={canManage}
            />
          </>
        ) : null}
        <Separator />
        <ForwardEndpointsSection
          applicationId={application.id}
          endpoints={application.forwardEndpoints}
          canManage={canManage}
        />
        <Separator />
        <TemplateConfigsSection
          applicationId={application.id}
          configs={application.templateConfigs}
          transport={application.activeTransport}
          canManage={canManage}
        />
      </CardContent>
    </Card>
  );
}
