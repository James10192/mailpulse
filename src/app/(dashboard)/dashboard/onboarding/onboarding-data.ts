import {
  Bell,
  Mail,
  Megaphone,
  MoreHorizontal,
  Target,
  UserPlus,
  Zap,
} from "lucide-react";

export interface OnboardingData {
  // Step 1
  organizationName: string;
  website: string;
  socialProfile: string;
  subscriberRange: string;
  usageDescription: string;
  // Step 2
  discoverySource: string;
  goals: string[];
  // Step 3
  domainName: string;
  // Step 4
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
}

export type OnboardingStepProps = {
  data: OnboardingData;
  onChange: (patch: Partial<OnboardingData>) => void;
};

export const INITIAL_DATA: OnboardingData = {
  organizationName: "",
  website: "https://",
  socialProfile: "",
  subscriberRange: "",
  usageDescription: "",
  discoverySource: "",
  goals: [],
  domainName: "",
  senderName: "",
  senderEmail: "",
  replyToEmail: "",
};

export const STEPS = [
  { label: "Détails", title: "Parlez-nous de votre entreprise" },
  { label: "Besoins", title: "Parlez-nous de vos besoins" },
  { label: "Domaine", title: "Configurez votre domaine d'envoi" },
  { label: "Expéditeur", title: "Configurez votre expéditeur" },
  { label: "Terminé", title: "Vous êtes prêt !" },
];

export const SUBSCRIBER_OPTIONS = [
  { value: "<1000", label: "Moins de 1 000" },
  { value: "1000-10000", label: "1 000 - 10 000" },
  { value: "10000-250000", label: "10 000 - 250 000" },
  { value: ">250000", label: "Plus de 250 000" },
];

export const DISCOVERY_SOURCES = [
  "Twitter",
  "YouTube",
  "Google",
  "Ami",
  "LinkedIn",
  "Product Hunt",
  "Autre",
];

export const GOAL_OPTIONS = [
  { value: "newsletters", label: "Envoyer des newsletters", icon: Mail },
  { value: "automations", label: "Automatiser les emails", icon: Zap },
  { value: "marketing", label: "Marketing", icon: Megaphone },
  { value: "notifications", label: "Notifications", icon: Bell },
  { value: "lead-generation", label: "Lead generation", icon: Target },
  { value: "user-onboarding", label: "User onboarding", icon: UserPlus },
  { value: "autre", label: "Autre", icon: MoreHorizontal },
];

/** Label with a leading icon, shared by every onboarding field. */
export const FIELD_LABEL_CLASS = "flex items-center gap-2";
