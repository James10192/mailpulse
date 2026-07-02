import { AlertTriangle, Building2, QrCode, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function WhatsAppLimitations({
  mailpulseWhatsAppAvailable,
}: {
  mailpulseWhatsAppAvailable: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Limites à connaître
        </CardTitle>
        <CardDescription>
          Choisissez le canal selon le niveau de fiabilité attendu pour vos relances automatiques.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <LimitItem
          icon={<ShieldCheck className="h-4 w-4 text-blue-500" />}
          title="Meta Cloud API"
          badge="Production"
          description="Canal officiel. Requiert WABA, numéro, token et templates approuvés pour écrire hors fenêtre 24h."
        />
        <LimitItem
          icon={<QrCode className="h-4 w-4 text-emerald-500" />}
          title="Baileys via QR code"
          badge="Dépannage"
          description="Simple à connecter, mais non officiel. La session peut expirer et le numéro peut être limité en volume."
        />
        <LimitItem
          icon={<Building2 className="h-4 w-4 text-orange-500" />}
          title="Ressource MailPulse"
          badge={mailpulseWhatsAppAvailable ? "Disponible" : "Indisponible"}
          description={
            mailpulseWhatsAppAvailable
              ? "Disponible si vous n'avez pas encore de numéro, avec une personnalisation et des volumes limités."
              : "Indisponible sur cette instance. Connectez Meta ou scannez un QR code Baileys pour envoyer."
          }
        />
      </CardContent>
    </Card>
  );
}

function LimitItem({
  icon,
  title,
  badge,
  description,
}: {
  icon: ReactNode;
  title: string;
  badge: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
          <Badge variant="outline">{badge}</Badge>
        </div>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
    </div>
  );
}
