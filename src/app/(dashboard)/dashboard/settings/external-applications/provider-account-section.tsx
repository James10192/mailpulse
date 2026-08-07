"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Pencil, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setMetaProviderAccount } from "./actions";
import type { ProviderAccountView } from "./types";

export function ProviderAccountSection({
  applicationId,
  account,
  canManage,
}: {
  applicationId: string;
  account: ProviderAccountView | null;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [waba, setWaba] = useState(account?.wabaId ?? "");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError("");
      setPhoneNumberId("");
      setAccessToken("");
      setAppSecret("");
      setVerifyToken("");
      setWaba(account?.wabaId ?? "");
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);
    const result = await setMetaProviderAccount(applicationId, {
      waba,
      phoneNumberId,
      accessToken,
      appSecret,
      verifyToken,
    });
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    window.setTimeout(() => setSuccess(false), 3000);
    handleOpenChange(false);
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          <MessageSquare className="h-4 w-4 text-zinc-400" />
          Compte Meta WhatsApp
        </h3>
        {canManage ? (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            {account ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {account ? "Modifier" : "Configurer"}
          </Button>
        ) : null}
      </div>

      {success ? <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">Compte Meta enregistré.</p> : null}

      <div className="mt-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        {account ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">WABA ID</p>
              <p className="mt-0.5 font-mono text-sm text-zinc-900 dark:text-zinc-100">{account.wabaId}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-zinc-500 dark:text-zinc-400">phone_number_id</p>
              <p className="mt-0.5 font-mono text-sm text-zinc-900 dark:text-zinc-100">
                {account.maskedSenderId ?? "Non défini"}
              </p>
            </div>
            <Badge variant={account.active ? "success" : "secondary"}>
              {account.active ? "Actif" : "Inactif"}
            </Badge>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Aucun compte Meta WhatsApp relié. Configurez le WABA et le numéro pour activer l&apos;envoi.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{account ? "Modifier le compte Meta" : "Configurer le compte Meta"}</DialogTitle>
              <DialogDescription>
                Les secrets sont chiffrés côté serveur et ne sont jamais réaffichés.
                {account ? " Laissez les trois champs secrets vides pour conserver les valeurs actuelles." : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`waba-${applicationId}`}>WABA ID</Label>
                <Input
                  id={`waba-${applicationId}`}
                  value={waba}
                  onChange={(event) => setWaba(event.target.value)}
                  placeholder="102290XXXXXXXXX"
                  required
                  pattern="\d{5,25}"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`phone-${applicationId}`}>phone_number_id</Label>
                <Input
                  id={`phone-${applicationId}`}
                  value={phoneNumberId}
                  onChange={(event) => setPhoneNumberId(event.target.value)}
                  placeholder={account?.maskedSenderId ?? "1064270XXXXXXXX"}
                  required
                  pattern="\d{5,25}"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`token-${applicationId}`}>Token d&apos;accès</Label>
              <Input
                id={`token-${applicationId}`}
                type="password"
                value={accessToken}
                onChange={(event) => setAccessToken(event.target.value)}
                autoComplete="off"
                required={!account}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`secret-${applicationId}`}>App secret</Label>
                <Input
                  id={`secret-${applicationId}`}
                  type="password"
                  value={appSecret}
                  onChange={(event) => setAppSecret(event.target.value)}
                  autoComplete="off"
                  required={!account}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`verify-${applicationId}`}>Verify token</Label>
                <Input
                  id={`verify-${applicationId}`}
                  type="password"
                  value={verifyToken}
                  onChange={(event) => setVerifyToken(event.target.value)}
                  autoComplete="off"
                  required={!account}
                />
              </div>
            </div>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
