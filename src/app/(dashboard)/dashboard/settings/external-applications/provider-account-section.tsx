"use client";

import { useState } from "react";
import { MessageSquare, Pencil, Plus, Power, PowerOff } from "lucide-react";

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
import { setProviderAccountActive } from "./baileys-actions";
import { BaileysAccountDialog } from "./baileys-account-dialog";
import { MetaAccountDialog } from "./meta-account-dialog";
import { TRANSPORT_LABEL, TransportExplainer } from "./transport-explainer";
import type { ProviderAccountView, WhatsAppTransport } from "./types";

const IDENTIFIER_LABEL: Record<WhatsAppTransport, string> = {
  META: "WABA ID",
  BAILEYS: "Instance Evolution",
};

export function ProviderAccountSection({
  applicationId,
  accounts,
  activeTransport,
  canManage,
}: {
  applicationId: string;
  accounts: ProviderAccountView[];
  activeTransport: WhatsAppTransport | null;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<WhatsAppTransport | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const metaAccount = accounts.find((account) => account.transport === "META") ?? null;
  const baileysAccount = accounts.find((account) => account.transport === "BAILEYS") ?? null;

  function markSaved() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 3000);
  }

  async function toggleAccount(accountId: string, active: boolean) {
    setError("");
    setPending(true);
    const result = await setProviderAccountActive(applicationId, accountId, active);
    setPending(false);
    if ("error" in result && result.error) setError(result.error);
  }

  function transportButton(transport: WhatsAppTransport, account: ProviderAccountView | null) {
    const blocked = activeTransport !== null && activeTransport !== transport;
    return (
      <Button
        key={transport}
        variant={activeTransport === transport ? "default" : "outline"}
        className="h-11 w-full sm:w-auto"
        disabled={blocked}
        onClick={() => setEditing(transport)}
      >
        {account ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        {account ? `Modifier ${TRANSPORT_LABEL[transport]}` : `Relier ${TRANSPORT_LABEL[transport]}`}
      </Button>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <MessageSquare className="h-4 w-4 text-zinc-400" />
          Transport WhatsApp
        </h3>
        {canManage ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            {transportButton("META", metaAccount)}
            {transportButton("BAILEYS", baileysAccount)}
          </div>
        ) : null}
      </div>

      {saved ? <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">Compte WhatsApp enregistré.</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {canManage && activeTransport !== null ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Une application ne peut avoir qu&apos;un seul compte WhatsApp actif. Désactivez le compte{" "}
          {TRANSPORT_LABEL[activeTransport]} ci-dessous pour basculer sur l&apos;autre transport.
        </p>
      ) : null}

      <div className="mt-3 space-y-3">
        {accounts.length === 0 ? (
          <div className="space-y-3">
            <p className="rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              Aucun compte WhatsApp relié. Choisissez le transport qui convient au client avant d&apos;activer
              l&apos;envoi.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <TransportExplainer transport="META" />
              <TransportExplainer transport="BAILEYS" />
            </div>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                    {IDENTIFIER_LABEL[account.transport]}
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {account.externalAccountId}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">
                    {account.transport === "META" ? "phone_number_id" : "Numéro connecté"}
                  </p>
                  <p className="mt-0.5 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                    {account.maskedSenderId ?? "Non défini"}
                  </p>
                </div>
                <Badge variant={account.active ? "success" : "secondary"}>
                  {account.active ? "Actif" : "Inactif"}
                </Badge>
              </div>
              {canManage ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="h-11 shrink-0" disabled={pending}>
                      {account.active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                      {account.active ? "Désactiver" : "Activer"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {account.active
                          ? `Désactiver le transport ${TRANSPORT_LABEL[account.transport]} ?`
                          : `Activer le transport ${TRANSPORT_LABEL[account.transport]} ?`}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {account.active
                          ? "Les envois WhatsApp de cette application seront refusés tant qu'aucun autre compte n'est actif. La configuration est conservée."
                          : "Ce compte deviendra le transport WhatsApp de l'application. L'opération échoue si un autre compte est déjà actif."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction
                        className={account.active ? "bg-red-600 hover:bg-red-500" : undefined}
                        onClick={() => toggleAccount(account.id, !account.active)}
                      >
                        {account.active ? "Désactiver" : "Activer"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </div>
          ))
        )}
      </div>

      <MetaAccountDialog
        applicationId={applicationId}
        account={metaAccount}
        open={editing === "META"}
        onOpenChange={(next) => setEditing(next ? "META" : null)}
        onSaved={markSaved}
      />
      <BaileysAccountDialog
        applicationId={applicationId}
        account={baileysAccount}
        open={editing === "BAILEYS"}
        onOpenChange={(next) => setEditing(next ? "BAILEYS" : null)}
        onSaved={markSaved}
      />
    </section>
  );
}
