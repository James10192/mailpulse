import { AlertTriangle, Building2, QrCode, ShieldCheck } from "lucide-react";

export function WhatsAppLimitations({
  mailpulseWhatsAppAvailable,
}: {
  mailpulseWhatsAppAvailable: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Limites à connaître</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Choisissez le canal selon le niveau de fiabilité attendu pour vos relances automatiques.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <div className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div>
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Meta Cloud API</p>
            <p className="mt-1 text-xs text-zinc-500">
              Canal officiel. Requiert WABA, numéro, token et templates approuvés pour écrire hors fenêtre 24h.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          <div>
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Baileys via QR code</p>
            <p className="mt-1 text-xs text-zinc-500">
              Simple à connecter, mais non officiel. La session peut expirer et le numéro peut être limité en volume.
            </p>
          </div>
        </div>
        <div className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
          <div>
            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Ressource MailPulse</p>
            <p className="mt-1 text-xs text-zinc-500">
              {mailpulseWhatsAppAvailable
                ? "Disponible si vous n'avez pas encore de numéro, avec une personnalisation et des volumes limités."
                : "Indisponible sur cette instance. Connectez Meta ou scannez un QR code Baileys pour envoyer."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
