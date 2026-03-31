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
      description: "Accedez a toutes les sections de MailPulse depuis la sidebar. Campagnes, Contacts, Analytics, Automations et plus.",
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
      description: "Recevez des alertes en temps reel sur vos campagnes, contacts et evenements importants.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: "[data-tour='nav-campaigns']",
    popover: {
      title: "Campagnes",
      description: "Creez, editez et envoyez vos campagnes email. Suivez les taux d'ouverture et de clic en temps reel.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-contacts']",
    popover: {
      title: "Contacts",
      description: "Gerez vos abonnes, ajoutez des tags, creez des segments et importez des contacts par CSV.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-analytics']",
    popover: {
      title: "Analytics",
      description: "Visualisez les performances de vos campagnes: delivrabilite, ouvertures, clics et desabonnements.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-capture']",
    popover: {
      title: "Pages de capture",
      description: "Creez des formulaires d'inscription pour collecter des emails. Partagez le lien et suivez les conversions.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-automations']",
    popover: {
      title: "Automations",
      description: "Creez des workflows visuels: emails de bienvenue, re-engagement, anniversaires. Glissez et connectez les etapes.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-senders']",
    popover: {
      title: "Expediteurs & Domaines",
      description: "Configurez vos adresses d'envoi et verifiez vos domaines pour une meilleure delivrabilite.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='nav-settings']",
    popover: {
      title: "Parametres",
      description: "Gerez votre profil, abonnement, comptes lies (Google/GitHub) et passkeys de securite.",
      side: "right",
      align: "start",
    },
  },
  {
    element: "[data-tour='theme']",
    popover: {
      title: "Theme",
      description: "Basculez entre le mode sombre, clair ou automatique selon votre preference.",
      side: "bottom",
      align: "end",
    },
  },
  {
    popover: {
      title: "Pret a commencer !",
      description: "Commencez par creer votre premier contact, puis creez une campagne et envoyez votre premier email. Bon courage !",
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
        prevBtnText: "← Precedent",
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
      className="p-2 rounded-lg text-zinc-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors cursor-pointer"
      title="Guide interactif"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
}

export function AutoTour() {
  const { startTour } = useAppTour();

  useEffect(() => {
    // Auto-start tour on first visit (after a delay)
    const timer = setTimeout(() => {
      if (!localStorage.getItem(TOUR_DONE_KEY)) {
        startTour();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [startTour]);

  return null;
}
