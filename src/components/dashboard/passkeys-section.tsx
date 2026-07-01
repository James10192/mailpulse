"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { Fingerprint, Plus, Trash2, Loader2, Smartphone, Monitor, Key, Shield } from "lucide-react";
import { ConfirmDialog } from "./confirm-dialog";

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
  return "Cle de securite";
}

function getPlatformHint() {
  if (typeof navigator === "undefined") return "votre appareil";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac")) return "Touch ID";
  if (ua.includes("win")) return "Windows Hello";
  if (ua.includes("iphone") || ua.includes("ipad")) return "Face ID / Touch ID";
  if (ua.includes("android")) return "Empreinte digitale";
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
      // No passkeys or not available
    }
    setLoading(false);
  }

  useEffect(() => {
    // Check WebAuthn support
    if (typeof window !== "undefined" && !window.PublicKeyCredential) {
      setSupported(false);
      setLoading(false);
      return;
    }

    loadPasskeys();
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
        setSuccess("Passkey ajoutee avec succes !");
        setTimeout(() => setSuccess(""), 3000);
        loadPasskeys();
      }
    } catch (e) {
      setError("L'operation a ete annulee ou n'est pas supportee.");
    }
    setAdding(false);
  }

  async function handleAddCrossPlatform() {
    setAddingCross(true);
    setError("");
    setSuccess("");
    try {
      const res = await authClient.passkey.addPasskey({
        name: "Cle de securite",
        authenticatorAttachment: "cross-platform",
      });
      if (res?.error) {
        setError(String(res.error.message ?? "Erreur lors de l'ajout."));
      } else {
        setSuccess("Cle de securite ajoutee !");
        setTimeout(() => setSuccess(""), 3000);
        loadPasskeys();
      }
    } catch {
      setError("L'operation a ete annulee.");
    }
    setAddingCross(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await authClient.passkey.deletePasskey({ id: deleteId });
      setPasskeys((prev) => prev.filter((p) => p.id !== deleteId));
    } catch {
      setError("Erreur lors de la suppression.");
    }
    setDeleteId(null);
    setDeleting(false);
  }

  if (!supported) {
    return (
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-orange-500" />
          Passkeys
        </h2>
        <p className="text-sm text-zinc-500">
          Votre navigateur ne supporte pas les passkeys (WebAuthn).
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Fingerprint className="h-5 w-5 text-orange-500" />
          Passkeys
        </h2>
      </div>
      <p className="text-xs text-zinc-500">
        Connectez-vous sans mot de passe avec {getPlatformHint()}, une cle de securite USB, ou un autre appareil.
      </p>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-sm text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-16">
          <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
        </div>
      ) : (
        <>
          {/* Existing passkeys */}
          {passkeys.length > 0 && (
            <div className="space-y-2">
              {passkeys.map((pk) => {
                const DeviceIcon = getDeviceIcon(pk.deviceType);
                return (
                  <div key={pk.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                        <DeviceIcon className="h-4 w-4 text-orange-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {pk.name || "Passkey"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {getDeviceLabel(pk.deviceType)} — {new Date(pk.createdAt).toLocaleDateString("fr-FR")}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setDeleteId(pk.id)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAddPlatform}
              disabled={adding}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border border-orange-500/30 text-orange-500 rounded-lg hover:bg-orange-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
              {adding ? "En attente..." : `Ajouter ${getPlatformHint()}`}
            </button>
            <button
              onClick={handleAddCrossPlatform}
              disabled={addingCross}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {addingCross ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
              Cle USB
            </button>
          </div>

          {passkeys.length === 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
              <Shield className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300/80">
                Les passkeys remplacent les mots de passe. Plus securisees, plus rapides, et synchronisees entre vos appareils.
              </p>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Supprimer cette passkey ?"
        message="Vous ne pourrez plus vous connecter avec cet appareil."
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </section>
  );
}
