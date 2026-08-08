"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

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
import { TransportExplainer } from "./transport-explainer";
import type { ProviderAccountView } from "./types";

export function MetaAccountDialog({
  applicationId,
  account,
  open,
  onOpenChange,
  onSaved,
}: {
  applicationId: string;
  account: ProviderAccountView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [waba, setWaba] = useState(account?.externalAccountId ?? "");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [verifyToken, setVerifyToken] = useState("");

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setError("");
      setPhoneNumberId("");
      setAccessToken("");
      setAppSecret("");
      setVerifyToken("");
      setWaba(account?.externalAccountId ?? "");
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
    onSaved();
    handleOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{account ? "Modifier le compte Meta" : "Relier un compte Meta Cloud API"}</DialogTitle>
            <DialogDescription>
              Les secrets sont chiffrés côté serveur et ne sont jamais réaffichés.
              {account ? " Laissez les trois champs secrets vides pour conserver les valeurs actuelles." : ""}
            </DialogDescription>
          </DialogHeader>
          <TransportExplainer transport="META" />
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
                className="h-11 font-mono"
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
                className="h-11 font-mono"
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
              className="h-11"
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
                className="h-11"
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
                className="h-11"
              />
            </div>
          </div>
          {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => handleOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
