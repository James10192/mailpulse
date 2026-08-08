"use client";

import { BadgeCheck, TriangleAlert } from "lucide-react";

import type { WhatsAppTransport } from "./types";

export const TRANSPORT_LABEL: Record<WhatsAppTransport, string> = {
  META: "Meta Cloud API",
  BAILEYS: "Baileys (Evolution API)",
};

const TRANSPORT_COPY: Record<WhatsAppTransport, { summary: string; pros: string[]; cons: string[] }> = {
  META: {
    summary: "Canal officiel WhatsApp Business, hébergé par Meta.",
    pros: [
      "Numéro officiel, stable, sans risque de blocage lié au canal.",
      "Statuts de livraison et de lecture fournis par Meta.",
    ],
    cons: [
      "Chaque message sortant hors conversation exige un template approuvé par Meta.",
      "Fenêtre de service de 24 h : passé ce délai, seul un template peut relancer le parent.",
      "Vérification d'entreprise obligatoire avant la mise en production.",
    ],
  },
  BAILEYS: {
    summary: "Session WhatsApp Web pilotée par Evolution API, non officielle.",
    pros: [
      "Aucun template à faire approuver : le corps du message est libre.",
      "Aucune fenêtre de 24 h, vous relancez un parent à tout moment.",
      "Mise en service immédiate, sans vérification d'entreprise.",
    ],
    cons: [
      "Canal non officiel : WhatsApp peut bloquer ou bannir le numéro connecté.",
      "La session dépend d'un téléphone appairé et peut se déconnecter.",
      "Pas de garantie contractuelle de Meta sur la délivrabilité.",
    ],
  },
};

/** Explains, before the choice is made, what the transport changes concretely. */
export function TransportExplainer({ transport }: { transport: WhatsAppTransport }) {
  const copy = TRANSPORT_COPY[transport];

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{TRANSPORT_LABEL[transport]}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{copy.summary}</p>
      <ul className="mt-3 space-y-1.5">
        {copy.pros.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" aria-hidden />
            {item}
          </li>
        ))}
        {copy.cons.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
            <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-orange-500" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
