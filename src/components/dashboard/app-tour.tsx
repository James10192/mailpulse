"use client";

import { useCallback, useEffect, useRef } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { HelpCircle } from "lucide-react";

const TOUR_DONE_KEY = "mailpulse-tour-done";

const tourSteps: DriveStep[] = [
  {
    element: "[data-tour='sidebar']",
    popover: {
      title: "Navigation",
      description: "Accédez à toutes les sections de MailPulse depuis la sidebar. Campagnes, contacts, analytics, automations et plus.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='search']",
    popover: {
      title: "Recherche rapide",
      description: "Utilisez Ctrl+K (ou Cmd+K sur Mac) pour rechercher rapidement dans toute l'application.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: "[data-tour='notifications']",
    popover: {
      title: "Notifications",
      description: "Recevez des alertes en temps réel sur vos campagnes, contacts et événements importants.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='nav-campaigns']",
    popover: {
      title: "Campagnes",
      description: "Créez, éditez et envoyez vos campagnes email. Suivez les taux d'ouverture et de clic en temps réel.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-contacts']",
    popover: {
      title: "Contacts",
      description: "Gérez vos abonnés, ajoutez des tags, créez des segments et importez des contacts par CSV.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-analytics']",
    popover: {
      title: "Analytics",
      description: "Visualisez les performances de vos campagnes : délivrabilité, ouvertures, clics et désabonnements.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-capture']",
    popover: {
      title: "Pages de capture",
      description: "Créez des formulaires d'inscription pour collecter des emails. Partagez le lien et suivez les conversions.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-automations']",
    popover: {
      title: "Automations",
      description: "Créez des workflows visuels : emails de bienvenue, réengagement, anniversaires. Glissez et connectez les étapes.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-senders']",
    popover: {
      title: "Expéditeurs et domaines",
      description: "Configurez vos adresses d'envoi et vérifiez vos domaines pour une meilleure délivrabilité.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-settings']",
    popover: {
      title: "Paramètres",
      description: "Gérez votre profil, abonnement, comptes liés (Google/GitHub) et passkeys de sécurité.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='theme']",
    popover: {
      title: "Thème",
      description: "Basculez entre le mode sombre, clair ou automatique selon votre préférence.",
      side: "bottom",
      align: "end",
    },
  },
  {
    popover: {
      title: "Prêt à commencer !",
      description: "Commencez par créer votre premier contact, puis créez une campagne et envoyez votre premier email.",
    },
  },
];

export function useAppTour() {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const startTour = useCallback((force = false) => {
    if (!force && localStorage.getItem(TOUR_DONE_KEY)) return;

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      const d = driver({
        showProgress: true,
        animate: true,
        smoothScroll: true,
        overlayColor: "rgba(0, 0, 0, 0.7)",
        stagePadding: 8,
        stageRadius: 8,
        popoverClass: "mailpulse-tour-popover",
        nextBtnText: "Suivant →",
        prevBtnText: "← Précédent",
        doneBtnText: "Terminer",
        progressText: "{{current}} / {{total}}",
        steps: tourSteps,
        onDestroyed: () => {
          localStorage.setItem(TOUR_DONE_KEY, "true");
        },
      });

      driverRef.current = d;
      d.drive();
    }, 500);
  }, []);

  useEffect(() => {
    return () => {
      driverRef.current?.destroy();
    };
  }, []);

  return { startTour };
}

export function TourButton() {
  const { startTour } = useAppTour();

  return (
    <button
      onClick={() => startTour(true)}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-400 transition-[scale,color,background-color] hover:bg-orange-50 hover:text-orange-500 active:scale-[0.96] dark:hover:bg-orange-500/10"
      title="Guide interactif"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}

export function AutoTour() {
  // Le guide reste disponible dans le header, sans bloquer la première tâche.
  return null;
}
