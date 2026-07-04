"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Key, Loader2, Monitor, Plus, Shield, Smartphone, Trash2 } from "lucide-react";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

interface PasskeyData {
  id: string;
  name: string | null;
  deviceType: string;
  createdAt: string;
}

function getDeviceIcon(deviceType: string) {
  if (deviceType === "singleDevice") return Smartphone;
  if (deviceType === "multiDevice") return Monitor;
  return Key;
}

function getDeviceLabel(deviceType: string) {
  if (deviceType === "singleDevice") return "Appareil unique";
  if (deviceType === "multiDevice") return "Multi-appareil";
  return "Clé de sécurité";
}

function getPlatformHint() {
  if (typeof navigator === "undefined") return "votre appareil";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "Touch ID";
  if (ua.includes("win")) return "Windows Hello";
  if (ua.includes("iphone") || ua.includes("ipad")) return "Face ID ou Touch ID";
  if (ua.includes("android")) return "empreinte digitale";
  return "votre appareil";
}

export function PasskeysSection() {
  const [passkeys, setPasskeys] = useState<PasskeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [addingCross, setAddingCross] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [supported, setSupported] = useState(true);

  async function loadPasskeys() {
    try {
      const res = await authClient.passkey.listUserPasskeys();
      if (res?.data) setPasskeys(res.data as unknown as PasskeyData[]);
    } catch {
      setPasskeys([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined" && !window.PublicKeyCredential) {
      setSupported(false);
      setLoading(false);
      return;
    }

    void loadPasskeys();
  }, []);

  async function handleAddPlatform() {
    setAdding(true);
    setError("");
    setSuccess("");
    try {
      const res = await authClient.passkey.addPasskey({
        name: getPlatformHint(),
        authenticatorAttachment: "platform",
      });
      if (res?.error) {
        setError(String(res.error.message ?? "Erreur lors de l'ajout."));
      } else {
        setSuccess("Passkey ajoutée avec succès.");
        window.setTimeout(() => setSuccess(""), 3000);
        void loadPasskeys();
      }
    } catch {
      setError("L'opération a été annulée ou n'est pas supportée.");
    } finally {
      setAdding(false);
    }
  }

  async function handleAddCrossPlatform() {
    setAddingCross(true);
    setError("");
    setSuccess("");
    try {
      const res = await authClient.passkey.addPasskey({
        name: "Clé de sécurité",
        authenticatorAttachment: "cross-platform",
      });
      if (res?.error) {
        setError(String(res.error.message ?? "Erreur lors de l'ajout."));
      } else {
        setSuccess("Clé de sécurité ajoutée.");
        window.setTimeout(() => setSuccess(""), 3000);
        void loadPasskeys();
      }
    } catch {
      setError("L'opération a été annulée.");
    } finally {
      setAddingCross(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await authClient.passkey.deletePasskey({ id: deleteId });
      setPasskeys((prev) => prev.filter((passkey) => passkey.id !== deleteId));
    } catch {
      setError("Erreur lors de la suppression.");
    } finally {
      setDeleteId(null);
      setDeleting(false);
    }
  }

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-orange-500" />
            Passkeys
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="warning">
            <Shield className="h-4 w-4" />
            <AlertTitle>Navigateur non compatible</AlertTitle>
            <AlertDescription>Votre navigateur ne supporte pas les passkeys WebAuthn.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-orange-500" />
              Passkeys
            </CardTitle>
            <CardDescription className="mt-1">
              Connectez-vous sans mot de passe avec {getPlatformHint()} ou une clé de sécurité.
            </CardDescription>
          </div>
          <Badge variant={passkeys.length > 0 ? "success" : "secondary"} className="shrink-0">
            {passkeys.length > 0 ? `${passkeys.length} active${passkeys.length > 1 ? "s" : ""}` : "Aucune"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Action impossible</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {success ? (
          <Alert variant="success">
            <AlertTitle>Action confirmée</AlertTitle>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        ) : null}

        {loading ? (
          <div className="flex min-h-24 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          </div>
        ) : (
          <div className="space-y-3">
            {passkeys.length === 0 ? (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Aucune passkey configurée</AlertTitle>
                <AlertDescription>
                  Les passkeys remplacent les mots de passe et restent synchronisées avec vos appareils compatibles.
                </AlertDescription>
              </Alert>
            ) : (
              passkeys.map((passkey) => {
                const DeviceIcon = getDeviceIcon(passkey.deviceType);

                return (
                  <div
                    key={passkey.id}
                    className="flex min-w-0 flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                        <DeviceIcon className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                          {passkey.name || "Passkey"}
                        </p>
                        <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {getDeviceLabel(passkey.deviceType)} ·{" "}
                          {new Date(passkey.createdAt).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 shrink-0 self-end text-zinc-500 hover:text-red-600 sm:self-auto"
                      onClick={() => setDeleteId(passkey.id)}
                      aria-label="Supprimer cette passkey"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Button type="button" className="min-h-11" onClick={handleAddPlatform} disabled={adding || loading}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {adding ? "En attente..." : `Ajouter ${getPlatformHint()}`}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={handleAddCrossPlatform}
            disabled={addingCross || loading}
          >
            {addingCross ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
            Clé USB
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette passkey ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous ne pourrez plus vous connecter avec cet appareil.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
