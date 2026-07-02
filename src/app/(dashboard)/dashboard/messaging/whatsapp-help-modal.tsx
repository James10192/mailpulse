"use client";

import { HelpModal, StepList } from "@/components/dashboard/help-modal";

export function WhatsAppHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
                <p className="mt-1 text-xs">
                  Gratuit et inclus dans votre abonnement. Connectez votre WhatsApp personnel ou business via QR code.
                  Attention : risque de suspension par WhatsApp en cas d&apos;usage intensif.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-blue-400">Meta Cloud API</p>
                <p className="mt-1 text-xs">
                  API officielle de Meta. Requiert un WhatsApp Business Account, un numéro et un access token.
                </p>
              </div>
            </div>
          ),
        },
        {
          title: "Connecter WhatsApp Web",
          content: (
            <StepList steps={[
              "Cliquez sur WhatsApp Web pour activer",
              "Un QR code s'affiche",
              "Ouvrez WhatsApp sur votre téléphone",
              "Allez dans Paramètres > Appareils liés > Lier un appareil",
              "Scannez le QR code",
              "La connexion est établie",
            ]} />
          ),
        },
        {
          title: "Campagnes WhatsApp",
          content: (
            <p className="text-xs">
              L&apos;envoi en masse agit comme une campagne WhatsApp ponctuelle. Le canal reste séparé des campagnes email car les limites, les templates et la délivrabilité ne sont pas les mêmes.
            </p>
          ),
        },
      ]}
    />
  );
}
