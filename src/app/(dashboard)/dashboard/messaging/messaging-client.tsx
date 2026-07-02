"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageSquare, Send, Loader2, Check,
  QrCode, Wifi, WifiOff,
  Settings2, Unplug, RefreshCw,
} from "lucide-react";
import {
  activateBaileys, getQrCode, checkConnectionStatus,
  sendMessage, sendBulkMessages, saveMetaConfig,
  disconnectWhatsApp, resetBaileysConnection,
} from "./actions";
import { HelpModal, HelpButton, StepList } from "@/components/dashboard/help-modal";
import { WhatsAppLimitations } from "./whatsapp-limitations";
import { RecipientPicker, type MessagingContactOption } from "./recipient-picker";

import type { WhatsAppMode } from "@/lib/whatsapp";

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

  // Baileys state
  const [activating, setActivating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  type ConnectionState = "open" | "close" | "connecting" | "none" | "error";
  const [connectionState, setConnectionState] = useState<ConnectionState>((evoStatus as ConnectionState) ?? "none");
  const [pollingQr, setPollingQr] = useState(false);
  const [resettingQr, setResettingQr] = useState(false);
  const connectionStateRef = useRef(connectionState);
  useEffect(() => { connectionStateRef.current = connectionState; }, [connectionState]);

  // Meta state
  const [showMetaConfig, setShowMetaConfig] = useState(false);
  const [metaForm, setMetaForm] = useState({ wabaId: "", phoneNumberId: "", accessToken: "", phone: "" });
  const [savingMeta, setSavingMeta] = useState(false);

  const isConnected = whatsappEnabled && (
    (whatsappMode === "BAILEYS" && connectionState === "open") ||
    (whatsappMode === "META" && metaConfigured)
  );

  // ─── Baileys: Poll QR code ─────────────────────────────

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
    } else if (!data.error && data.state !== "open") {
      // QR not ready yet — retry after a short delay
      setTimeout(async () => {
        const retry = await getQrCode();
        if (retry.qr) setQrCode(retry.qr);
        if (retry.state === "open") setConnectionState("open");
        setPollingQr(false);
      }, 3000);
      return;
    } else {
      setPollingQr(false);
    }
    if (data.error) {
      setResult({ error: data.error });
    }
  }, [pollingQr]);

  // Auto-poll when connecting
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

  // ─── Handlers ──────────────────────────────────────────

  async function handleActivateBaileys() {
    setActivating(true);
    setResult(null);
    const res = await activateBaileys();
    setActivating(false);
    if (res?.success) {
      setConnectionState("connecting");
      // Fetch QR code after small delay
      setTimeout(pollQrCode, 2000);
    } else {
      setResult(res);
    }
  }

  async function handleSaveMetaConfig() {
    setSavingMeta(true);
    setResult(null);
    const res = await saveMetaConfig(
      metaForm.wabaId, metaForm.phoneNumberId,
      metaForm.accessToken, metaForm.phone,
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
    if (res?.success) { setBody(""); setPhone(""); }
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          WhatsApp
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Envoyez des messages WhatsApp a vos contacts
        </p>
      </div>

      <WhatsAppLimitations mailpulseWhatsAppAvailable={mailpulseWhatsAppAvailable} />

      {/* ─── Not activated ─── */}
      {!whatsappEnabled && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
            <MessageSquare className="h-8 w-8 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Activez WhatsApp
            </h2>
            <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
              Choisissez votre mode de connexion WhatsApp pour commencer a envoyer des messages.
            </p>
          </div>

          {/* Mode choice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
            {/* Baileys option */}
            <button
              onClick={handleActivateBaileys}
              disabled={activating || !baileysAvailable}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 mb-2">
                <QrCode className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  WhatsApp Web
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Gratuit — Scannez un QR code avec votre telephone. Inclus dans l&apos;abonnement.
              </p>
              {activating && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Activation...
                </div>
              )}
            </button>

            {/* Meta option */}
            <button
              onClick={() => setShowMetaConfig(true)}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Meta Cloud API
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Pay-as-you-go — API officielle Meta. ~0.02$/conversation. Zero risque de ban.
              </p>
            </button>
          </div>

          {!baileysAvailable && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
              Le service WhatsApp Web n&apos;est pas encore disponible sur cette instance. Contactez l&apos;administrateur.
            </div>
          )}

          {result?.error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {result.error}
            </div>
          )}
        </div>
      )}

      {/* ─── Meta Config Modal ─── */}
      {showMetaConfig && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-blue-500" />
            Configuration Meta Cloud API
          </h3>
          <p className="text-xs text-zinc-500">
            Renseignez les informations de votre WhatsApp Business Account depuis le{" "}
            <a href="https://business.facebook.com" target="_blank" rel="noopener" className="text-blue-400 underline">
              Meta Business Manager
            </a>.
          </p>
          <div className="space-y-3">
            <input
              value={metaForm.phone}
              onChange={(e) => setMetaForm({ ...metaForm, phone: e.target.value })}
              placeholder="Numero WhatsApp (+225...)"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <input
              value={metaForm.wabaId}
              onChange={(e) => setMetaForm({ ...metaForm, wabaId: e.target.value })}
              placeholder="WABA ID (WhatsApp Business Account ID)"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <input
              value={metaForm.phoneNumberId}
              onChange={(e) => setMetaForm({ ...metaForm, phoneNumberId: e.target.value })}
              placeholder="Phone Number ID"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            <input
              value={metaForm.accessToken}
              onChange={(e) => setMetaForm({ ...metaForm, accessToken: e.target.value })}
              placeholder="Access Token (long-lived)"
              type="password"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveMetaConfig}
              disabled={savingMeta || !metaForm.wabaId || !metaForm.phoneNumberId || !metaForm.accessToken}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
            >
              {savingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sauvegarder"}
            </button>
            <button
              onClick={() => setShowMetaConfig(false)}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-500 hover:border-zinc-400 cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ─── QR Code Pairing (Baileys connecting) ─── */}
      {whatsappEnabled && whatsappMode === "BAILEYS" && connectionState !== "open" && evoInstanceName && (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2 text-amber-400">
            <WifiOff className="h-5 w-5" />
            <span className="text-sm font-medium">WhatsApp non connecte</span>
          </div>

          {qrCode ? (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Scannez ce QR code avec WhatsApp &gt; Appareils lies &gt; Lier un appareil
              </p>
              {qrCode.startsWith("data:") || qrCode.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrCode} alt="QR Code WhatsApp" className="mx-auto w-64 h-64 rounded-xl" />
              ) : (
                <div className="mx-auto w-64 h-64 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-zinc-400" />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-zinc-500">
                Cliquez pour generer le QR code de connexion
              </p>
              <button
                onClick={pollQrCode}
                disabled={pollingQr}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium cursor-pointer disabled:opacity-50"
              >
                {pollingQr ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Afficher le QR code
              </button>
            </div>
          )}

          <button
            onClick={pollQrCode}
            disabled={pollingQr}
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mx-auto cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${pollingQr ? "animate-spin" : ""}`} />
            Rafraichir
          </button>

          <div className="mx-auto max-w-md rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-left">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Si WhatsApp indique qu&apos;il est impossible de lier un appareil maintenant,
              réinitialisez le QR. MailPulse supprimera la session Baileys actuelle et
              créera une nouvelle instance propre.
            </p>
            <button
              onClick={handleResetBaileys}
              disabled={resettingQr || pollingQr}
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-amber-500/30 px-3 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-amber-300"
            >
              {resettingQr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Réinitialiser le QR
            </button>
          </div>
        </div>
      )}

      {/* ─── Connected — Messaging UI ─── */}
      {isConnected && (
        <>
          {/* Status bar */}
          <div className="flex items-start justify-between gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-start gap-3">
              <Wifi className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-300/80 space-y-1">
                <p className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  WhatsApp connecte
                  <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
                    {whatsappMode === "BAILEYS" ? "WhatsApp Web" : "Meta Cloud API"}
                  </span>
                </p>
                <p>{contactsWithPhone} contact{contactsWithPhone !== 1 ? "s" : ""} avec un numero.</p>
                {whatsappPhone && (
                  <p className="font-mono text-zinc-300">{whatsappPhone}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HelpButton onClick={() => setHelpOpen(true)} />
              <button
                onClick={handleDisconnect}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                title="Deconnecter WhatsApp"
              >
                <Unplug className="h-4 w-4" />
              </button>
            </div>
          </div>

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

          {/* Message */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 space-y-3">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Message</h2>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={4096}
              placeholder="Bonjour {{firstName}}, ..."
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
            />
            <div className="flex justify-between text-[11px] text-zinc-500">
              <span>Variables : {"{{firstName}}"}, {"{{lastName}}"}</span>
              <span>{body.length} / 4096</span>
            </div>
          </div>

          {/* Result */}
          {result?.success && (
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
              <Check className="h-5 w-5 text-emerald-500" />
              <p className="text-sm text-emerald-400">Message{mode === "bulk" ? "s" : ""} envoye{mode === "bulk" ? "s" : ""} !</p>
            </div>
          )}
          {result?.error && (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-sm text-red-400">
              {result.error}
            </div>
          )}

          {/* Send button */}
          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={sending || !body || (mode === "single" && !phone)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-emerald-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer {mode === "bulk" ? "en masse" : ""}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Help Modal ─── */

function WhatsAppHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <HelpModal
      open={open}
      onClose={onClose}
      title="WhatsApp"
      subtitle="Comment envoyer des messages"
      sections={[
        {
          title: "Deux modes disponibles",
          defaultOpen: true,
          content: (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-emerald-400">WhatsApp Web (Baileys)</p>
                <p className="text-xs mt-1">
                  Gratuit et inclus dans votre abonnement. Connectez votre WhatsApp personnel ou business via QR code.
                  Attention : risque de suspension par WhatsApp en cas d&apos;usage intensif.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-400">Meta Cloud API</p>
                <p className="text-xs mt-1">
                  API officielle de Meta. Pay-as-you-go (~0.02$/conversation). Aucun risque de ban.
                  Necessite un WhatsApp Business Account et une Facebook App.
                </p>
              </div>
            </div>
          ),
        },
        {
          title: "Connecter WhatsApp Web",
          content: (
            <StepList steps={[
              "Cliquez sur 'WhatsApp Web' pour activer",
              "Un QR code s'affiche",
              "Ouvrez WhatsApp sur votre telephone",
              "Allez dans Parametres > Appareils lies > Lier un appareil",
              "Scannez le QR code",
              "La connexion est etablie !",
            ]} />
          ),
        },
        {
          title: "Configurer Meta Cloud API",
          content: (
            <StepList steps={[
              "Creez une Facebook App sur developers.facebook.com",
              "Activez le produit WhatsApp",
              "Obtenez votre WABA ID, Phone Number ID et Access Token",
              "Renseignez ces informations dans MailPulse",
              "Commencez a envoyer via l'API officielle",
            ]} />
          ),
        },
        {
          title: "FAQ",
          content: (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-zinc-300">Puis-je utiliser les deux modes ?</p>
                <p className="text-xs mt-1">Vous pouvez configurer les deux mais un seul est actif a la fois.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">WhatsApp Web est-il vraiment gratuit ?</p>
                <p className="text-xs mt-1">Oui, c&apos;est inclus dans votre abonnement Pro. Mais WhatsApp peut suspendre les comptes qui envoient en masse.</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-300">Combien coute Meta Cloud API ?</p>
                <p className="text-xs mt-1">Meta facture par conversation : ~0.02$ (service), ~0.04$ (utility), ~0.08$ (marketing). 1000 conversations de service gratuites par mois.</p>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
}
