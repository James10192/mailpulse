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

import { HelpButton } from "@/components/dashboard/help-modal";
import { PlanReadOnlyNotice } from "@/components/dashboard/plan-read-only-notice";
import { PhoneNumberInput } from "@/components/dashboard/phone-number-input";
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
  canManage,
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
  canManage: boolean;
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
  const providerLabel = whatsappMode === "BAILEYS" ? "WhatsApp Web" : "Meta Cloud API";
  const statusLabel = isConnected ? "Connecté" : whatsappEnabled ? "À réparer" : "Non activé";
  const statusVariant = isConnected ? "success" : whatsappEnabled ? "warning" : "outline";

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
    const res = mode === "single" ? await sendMessage(phone, body) : await sendBulkMessages(body, audience);
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
    <div className="mx-auto w-full max-w-6xl space-y-5">
      {!canManage ? <PlanReadOnlyNotice feature="La configuration et l’envoi WhatsApp" /> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-balance text-2xl font-semibold text-zinc-950 dark:text-zinc-50">WhatsApp</h1>
          <p className="mt-1 max-w-2xl text-pretty text-sm text-zinc-500 dark:text-zinc-400">
            Supervisez la connexion, réparez le canal, puis envoyez des messages directs ou groupés.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HelpButton onClick={() => setHelpOpen(true)} />
          <Button type="button" variant="outline" className="min-h-10" onClick={() => setShowMetaConfig(true)} disabled={!canManage} title={!canManage ? "Disponible avec le plan Pro" : undefined}>
            <Settings2 className="size-4" />
            Configurer Meta
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="État" value={statusLabel} />
        <Metric label="Mode" value={whatsappEnabled ? providerLabel : "Aucun"} />
        <Metric label="Contacts joignables" value={contactsWithPhone.toLocaleString("fr-FR")} />
        <Metric label="Session" value={whatsappMode === "BAILEYS" ? connectionState : metaConfigured ? "configurée" : "à compléter"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  {isConnected ? <Wifi className="size-5 text-emerald-500" /> : <WifiOff className="size-5 text-amber-500" />}
                  Santé du canal
                </CardTitle>
                <CardDescription>
                  {isConnected
                    ? "Le canal est prêt pour les messages WhatsApp."
                    : whatsappEnabled
                      ? "La connexion existe, mais une action est nécessaire."
                      : "Aucun canal WhatsApp n'est encore activé."}
                </CardDescription>
              </div>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!whatsappEnabled ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleActivateBaileys}
                  disabled={activating || !baileysAvailable}
                  className="h-auto min-h-24 flex-col items-start justify-start p-4 text-left transition-[scale,color,background-color,box-shadow] active:scale-[0.99]"
                >
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <QrCode className="size-5 text-emerald-500" />
                    WhatsApp Web
                  </span>
                  <span className="text-pretty text-xs text-zinc-500">
                    Scannez un QR code avec votre téléphone. Inclus dans l&apos;abonnement.
                  </span>
                  {activating ? (
                    <span className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                      <Loader2 className="size-3 animate-spin" />
                      Activation...
                    </span>
                  ) : null}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMetaConfig(true)}
                  className="h-auto min-h-24 flex-col items-start justify-start p-4 text-left transition-[scale,color,background-color,box-shadow] active:scale-[0.99]"
                >
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Settings2 className="size-5 text-blue-500" />
                    Meta Cloud API
                  </span>
                  <span className="text-pretty text-xs text-zinc-500">
                    API officielle Meta, recommandée pour la production.
                  </span>
                </Button>
              </div>
            ) : null}

            {whatsappEnabled && whatsappMode === "BAILEYS" && connectionState !== "open" && evoInstanceName ? (
              <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
                <div className="flex min-h-72 items-center justify-center rounded-lg border bg-zinc-50 p-4 dark:bg-zinc-900">
                  {qrCode ? (
                    qrCode.startsWith("data:") || qrCode.startsWith("http") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={qrCode} alt="QR Code WhatsApp" className="size-64 rounded-lg" />
                    ) : (
                      <QrCode className="size-20 text-zinc-400" />
                    )
                  ) : (
                    <div className="space-y-3 text-center">
                      <QrCode className="mx-auto size-14 text-zinc-400" />
                      <Button type="button" onClick={pollQrCode} disabled={pollingQr}>
                        {pollingQr ? <Loader2 className="size-4 animate-spin" /> : <QrCode className="size-4" />}
                        Afficher le QR
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Action requise</p>
                  <p className="text-pretty text-sm text-zinc-500 dark:text-zinc-400">
                    Ouvrez WhatsApp, Appareils liés, puis liez un appareil. Si la liaison échoue, réinitialisez la session.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={pollQrCode} disabled={pollingQr} className="min-h-10">
                      <RefreshCw className={pollingQr ? "size-4 animate-spin" : "size-4"} />
                      Rafraîchir
                    </Button>
                    <Button type="button" variant="outline" onClick={handleResetBaileys} disabled={resettingQr || pollingQr} className="min-h-10">
                      {resettingQr ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                      Réinitialiser
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {isConnected ? (
              <div className="flex flex-col gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1 text-sm text-emerald-800 dark:text-emerald-300">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    WhatsApp connecté
                    <Badge variant="success">{providerLabel}</Badge>
                  </p>
                  <p>{contactsWithPhone} contact{contactsWithPhone !== 1 ? "s" : ""} avec un numéro.</p>
                  {whatsappPhone ? <p className="font-mono text-xs">{whatsappPhone}</p> : null}
                </div>
                <Button type="button" variant="outline" onClick={handleDisconnect} className="min-h-10 sm:self-start">
                  <Unplug className="size-4" />
                  Déconnecter
                </Button>
              </div>
            ) : null}

            {!baileysAvailable ? (
              <Alert variant="warning">
                <AlertDescription>
                  Le service WhatsApp Web n&apos;est pas disponible sur cette instance. Connectez Meta Cloud API ou contactez l&apos;administrateur.
                </AlertDescription>
              </Alert>
            ) : null}
            {result?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>

        <WhatsAppLimitations mailpulseWhatsAppAvailable={mailpulseWhatsAppAvailable} />
      </div>

      <Dialog open={showMetaConfig} onOpenChange={setShowMetaConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-4 text-blue-500" />
              Configuration Meta Cloud API
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de votre WhatsApp Business Account depuis le Meta Business Manager.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <PhoneNumberInput
              id="meta-whatsapp-phone"
              label="Numéro WhatsApp"
              value={metaForm.phone}
              onChange={(phone) => setMetaForm({ ...metaForm, phone })}
            />
            <Input value={metaForm.wabaId} onChange={(event) => setMetaForm({ ...metaForm, wabaId: event.target.value })} placeholder="WABA ID" />
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
              {savingMeta ? <Loader2 className="size-4 animate-spin" /> : null}
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WhatsAppHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {isConnected ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Composer un message</h2>
            <p className="mt-1 text-pretty text-sm text-zinc-500 dark:text-zinc-400">
              L&apos;envoi reste disponible, mais il dépend de l&apos;état de connexion affiché plus haut.
            </p>
          </div>
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
                    {mode === "bulk" ? "Campagne WhatsApp ponctuelle, séparée des campagnes email." : "Message direct vers un contact WhatsApp."}
                  </CardDescription>
                </div>
                {mode === "bulk" ? <Badge variant="warning">Campagne WhatsApp</Badge> : null}
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
              <div className="flex justify-between gap-3 text-[11px] text-zinc-500">
                <span>Variables : {"{{firstName}}"}, {"{{lastName}}"}</span>
                <span className="tabular-nums">{body.length} / 4096</span>
              </div>
            </CardContent>
          </Card>

          {result?.success ? (
            <Alert variant="success" className="flex items-center gap-3">
              <Check className="size-5" />
              <AlertDescription>{mode === "bulk" ? "Campagne WhatsApp lancée." : "Message envoyé."}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" size="lg" onClick={handleSend} disabled={!canManage || sending || !body || (mode === "single" && !phone)} title={!canManage ? "Disponible avec le plan Pro" : undefined}>
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              {mode === "bulk" ? "Lancer la campagne WhatsApp" : "Envoyer"}
            </Button>
          </div>
        </section>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <MessageSquare className="mt-0.5 size-5 text-zinc-400" />
              <div>
                <p className="text-sm font-medium text-zinc-950 dark:text-zinc-50">Composer sera disponible après connexion</p>
                <p className="text-pretty text-sm text-zinc-500 dark:text-zinc-400">
                  Activez WhatsApp Web ou configurez Meta Cloud API pour envoyer un message.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" className="min-h-10" onClick={() => setShowMetaConfig(true)}>
              Configurer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
      </div>
    </div>
  );
}
