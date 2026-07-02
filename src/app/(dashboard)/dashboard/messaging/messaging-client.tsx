"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Loader2,
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  Settings2,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HelpButton } from "@/components/dashboard/help-modal";
import type { WhatsAppMode } from "@/lib/whatsapp";
import {
  activateBaileys,
  checkConnectionStatus,
  disconnectWhatsApp,
  getQrCode,
  resetBaileysConnection,
  saveMetaConfig,
  sendBulkMessages,
  sendMessage,
} from "./actions";
import { RecipientPicker, type MessagingContactOption } from "./recipient-picker";
import { WhatsAppHelpModal } from "./whatsapp-help-modal";
import { WhatsAppLimitations } from "./whatsapp-limitations";

type ConnectionState = "open" | "close" | "connecting" | "none" | "error";

export function MessagingClient({
  contactsWithPhone,
  contactOptions,
  availableTags,
  whatsappEnabled,
  whatsappMode,
  whatsappPhone,
  evoInstanceName,
  evoStatus,
  metaConfigured,
  baileysAvailable,
  mailpulseWhatsAppAvailable,
}: {
  contactsWithPhone: number;
  contactOptions: MessagingContactOption[];
  availableTags: string[];
  whatsappEnabled: boolean;
  whatsappMode: WhatsAppMode;
  whatsappPhone: string | null;
  evoInstanceName: string | null;
  evoStatus: string | null;
  metaConfigured: boolean;
  baileysAvailable: boolean;
  mailpulseWhatsAppAvailable: boolean;
}) {
  const [mode, setMode] = useState<"single" | "bulk">("single");
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | string>("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [activating, setActivating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>((evoStatus as ConnectionState) ?? "none");
  const [pollingQr, setPollingQr] = useState(false);
  const [resettingQr, setResettingQr] = useState(false);
  const [showMetaConfig, setShowMetaConfig] = useState(false);
  const [metaForm, setMetaForm] = useState({ wabaId: "", phoneNumberId: "", accessToken: "", phone: "" });
  const [savingMeta, setSavingMeta] = useState(false);
  const connectionStateRef = useRef(connectionState);

  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);

  const isConnected = whatsappEnabled && (
    (whatsappMode === "BAILEYS" && connectionState === "open") ||
    (whatsappMode === "META" && metaConfigured)
  );

  const pollQrCode = useCallback(async () => {
    if (pollingQr) return;
    setPollingQr(true);

    const data = await getQrCode();
    if (data.state === "open") {
      setConnectionState("open");
      setQrCode(null);
      setPollingQr(false);
      return;
    }

    if (data.qr) {
      setQrCode(data.qr);
      setPollingQr(false);
      return;
    }

    if (!data.error && data.state !== "open") {
      setTimeout(async () => {
        const retry = await getQrCode();
        if (retry.qr) setQrCode(retry.qr);
        if (retry.state === "open") setConnectionState("open");
        if (retry.error) setResult({ error: retry.error });
        setPollingQr(false);
      }, 3000);
      return;
    }

    if (data.error) setResult({ error: data.error });
    setPollingQr(false);
  }, [pollingQr]);

  useEffect(() => {
    if (!whatsappEnabled || whatsappMode !== "BAILEYS" || !evoInstanceName) return;
    if (connectionStateRef.current === "open") return;

    const interval = setInterval(async () => {
      const status = await checkConnectionStatus();
      setConnectionState(status.state as ConnectionState);
      if (status.state === "open") {
        setQrCode(null);
        clearInterval(interval);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [whatsappEnabled, whatsappMode, evoInstanceName]);

  async function handleActivateBaileys() {
    setActivating(true);
    setResult(null);
    const res = await activateBaileys();
    setActivating(false);
    if (res?.success) {
      setConnectionState("connecting");
      setTimeout(pollQrCode, 2000);
    } else {
      setResult(res);
    }
  }

  async function handleSaveMetaConfig() {
    setSavingMeta(true);
    setResult(null);
    const res = await saveMetaConfig(
      metaForm.wabaId,
      metaForm.phoneNumberId,
      metaForm.accessToken,
      metaForm.phone,
    );
    setSavingMeta(false);
    setResult(res);
    if (res?.success) setShowMetaConfig(false);
  }

  async function handleSend() {
    setSending(true);
    setResult(null);
    const res = mode === "single"
      ? await sendMessage(phone, body)
      : await sendBulkMessages(body, audience);
    setSending(false);
    setResult(res);
    if (res?.success) {
      setBody("");
      if (mode === "single") setPhone("");
    }
  }

  async function handleDisconnect() {
    const res = await disconnectWhatsApp();
    if (res?.success) {
      setConnectionState("none");
      setQrCode(null);
    }
  }

  async function handleResetBaileys() {
    setResettingQr(true);
    setResult(null);
    setQrCode(null);
    const res = await resetBaileysConnection();
    if (res?.success) {
      setConnectionState("connecting");
      setTimeout(pollQrCode, 1500);
    } else {
      setResult(res);
    }
    setResettingQr(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">WhatsApp</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Envoyez des messages WhatsApp à vos contacts.
        </p>
      </div>

      <WhatsAppLimitations mailpulseWhatsAppAvailable={mailpulseWhatsAppAvailable} />

      {!whatsappEnabled && (
        <Card className="text-center">
          <CardContent className="space-y-6 p-8">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <MessageSquare className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Activez WhatsApp</CardTitle>
              <CardDescription className="mx-auto mt-2 max-w-md">
                Choisissez votre mode de connexion WhatsApp pour commencer à envoyer des messages.
              </CardDescription>
            </div>

            <div className="mx-auto grid max-w-lg grid-cols-1 gap-4 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleActivateBaileys}
                disabled={activating || !baileysAvailable}
                className="h-auto min-h-28 flex-col items-start justify-start p-4 text-left"
              >
                <div className="mb-2 flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm font-semibold">WhatsApp Web</span>
                </div>
                <span className="text-xs text-zinc-500">
                  Scannez un QR code avec votre téléphone. Inclus dans l&apos;abonnement.
                </span>
                {activating && (
                  <span className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Activation...
                  </span>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMetaConfig(true)}
                className="h-auto min-h-28 flex-col items-start justify-start p-4 text-left"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-semibold">Meta Cloud API</span>
                </div>
                <span className="text-xs text-zinc-500">
                  API officielle Meta, recommandée pour la production.
                </span>
              </Button>
            </div>

            {!baileysAvailable && (
              <Alert variant="warning" className="text-left text-xs">
                <AlertDescription>
                  Le service WhatsApp Web n&apos;est pas encore disponible sur cette instance. Contactez l&apos;administrateur.
                </AlertDescription>
              </Alert>
            )}

            {result?.error && (
              <Alert variant="destructive" className="text-left">
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showMetaConfig} onOpenChange={setShowMetaConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-blue-500" />
              Configuration Meta Cloud API
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de votre WhatsApp Business Account depuis le Meta Business Manager.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <Input
              value={metaForm.phone}
              onChange={(event) => setMetaForm({ ...metaForm, phone: event.target.value })}
              placeholder="Numéro WhatsApp (+225...)"
            />
            <Input
              value={metaForm.wabaId}
              onChange={(event) => setMetaForm({ ...metaForm, wabaId: event.target.value })}
              placeholder="WABA ID"
            />
            <Input
              value={metaForm.phoneNumberId}
              onChange={(event) => setMetaForm({ ...metaForm, phoneNumberId: event.target.value })}
              placeholder="Phone Number ID"
            />
            <Input
              value={metaForm.accessToken}
              onChange={(event) => setMetaForm({ ...metaForm, accessToken: event.target.value })}
              placeholder="Access Token"
              type="password"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowMetaConfig(false)}>
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleSaveMetaConfig}
              disabled={savingMeta || !metaForm.wabaId || !metaForm.phoneNumberId || !metaForm.accessToken}
            >
              {savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {whatsappEnabled && whatsappMode === "BAILEYS" && connectionState !== "open" && evoInstanceName && (
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-sm text-amber-500">
              <WifiOff className="h-5 w-5" />
              WhatsApp non connecté
            </CardTitle>
            <CardDescription>
              Scannez le QR code avec WhatsApp, Appareils liés, Lier un appareil.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {qrCode ? (
              qrCode.startsWith("data:") || qrCode.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCode} alt="QR Code WhatsApp" className="mx-auto h-64 w-64 rounded-xl" />
              ) : (
                <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800">
                  <QrCode className="h-16 w-16 text-zinc-400" />
                </div>
              )
            ) : (
              <Button type="button" onClick={pollQrCode} disabled={pollingQr}>
                {pollingQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Afficher le QR code
              </Button>
            )}

            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={pollQrCode} disabled={pollingQr}>
                <RefreshCw className={`h-4 w-4 ${pollingQr ? "animate-spin" : ""}`} />
                Rafraîchir
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={handleResetBaileys} disabled={resettingQr || pollingQr}>
                {resettingQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Réinitialiser le QR
              </Button>
            </div>

            <Alert variant="warning" className="text-left text-xs">
              <AlertDescription>
                Si WhatsApp refuse la liaison, réinitialisez le QR. MailPulse supprimera la session Baileys actuelle et créera une nouvelle instance propre.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {isConnected && (
        <>
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="flex items-start justify-between gap-3 p-4">
              <div className="flex items-start gap-3">
                <Wifi className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <div className="space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    WhatsApp connecté
                    <Badge variant="success">{whatsappMode === "BAILEYS" ? "WhatsApp Web" : "Meta Cloud API"}</Badge>
                  </p>
                  <p>{contactsWithPhone} contact{contactsWithPhone !== 1 ? "s" : ""} avec un numéro.</p>
                  {whatsappPhone && <p className="font-mono text-xs">{whatsappPhone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <HelpButton onClick={() => setHelpOpen(true)} />
                <Button type="button" variant="ghost" size="icon" onClick={handleDisconnect} title="Déconnecter WhatsApp">
                  <Unplug className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <WhatsAppHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

          <RecipientPicker
            contactsWithPhone={contactsWithPhone}
            contacts={contactOptions}
            availableTags={availableTags}
            mode={mode}
            phone={phone}
            audience={audience}
            onModeChange={setMode}
            onPhoneChange={setPhone}
            onAudienceChange={setAudience}
          />

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-sm uppercase tracking-wider text-zinc-500">Message</CardTitle>
                  <CardDescription>
                    {mode === "bulk"
                      ? "Campagne WhatsApp ponctuelle, séparée des campagnes email."
                      : "Message direct vers un contact WhatsApp."}
                  </CardDescription>
                </div>
                {mode === "bulk" && <Badge variant="warning">Campagne WhatsApp</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                rows={4}
                maxLength={4096}
                placeholder="Bonjour {{firstName}}, ..."
                className="resize-y"
              />
              <div className="flex justify-between text-[11px] text-zinc-500">
                <span>Variables : {"{{firstName}}"}, {"{{lastName}}"}</span>
                <span>{body.length} / 4096</span>
              </div>
            </CardContent>
          </Card>

          {result?.success && (
            <Alert variant="success" className="flex items-center gap-3">
              <Check className="h-5 w-5" />
              <AlertDescription>
                {mode === "bulk" ? "Campagne WhatsApp lancée." : "Message envoyé."}
              </AlertDescription>
            </Alert>
          )}

          {result?.error && (
            <Alert variant="destructive">
              <AlertDescription>{result.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              size="lg"
              onClick={handleSend}
              disabled={sending || !body || (mode === "single" && !phone)}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {mode === "bulk" ? "Lancer la campagne WhatsApp" : "Envoyer"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
