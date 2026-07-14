export type PlanTier = "FREE" | "PRO" | "ENTERPRISE";

export type PlanFeature =
  | "whatsapp"
  | "api_access"
  | "webhooks"
  | "recoveries"
  | "sso"
  | "dedicated_ip";

export type PlanLimits = {
  contacts: number;
  emailsPerMonth: number;
  activeCampaigns: number;
  automations: number;
  snippets: number;
  segments: number;
  domains: number;
  label: string;
  priceFCFA: number;
};

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    contacts: 1000,
    emailsPerMonth: 5000,
    activeCampaigns: 3,
    automations: 1,
    snippets: 10,
    segments: 3,
    domains: 1,
    label: "Starter",
    priceFCFA: 0,
  },
  PRO: {
    contacts: 25000,
    emailsPerMonth: -1,
    activeCampaigns: -1,
    automations: -1,
    snippets: -1,
    segments: -1,
    domains: -1,
    label: "Pro",
    priceFCFA: 15000,
  },
  ENTERPRISE: {
    contacts: -1,
    emailsPerMonth: -1,
    activeCampaigns: -1,
    automations: -1,
    snippets: -1,
    segments: -1,
    domains: -1,
    label: "Enterprise",
    priceFCFA: -1,
  },
};

const PLAN_FEATURES: Record<PlanTier, readonly PlanFeature[]> = {
  FREE: [],
  PRO: ["whatsapp", "api_access", "webhooks", "recoveries"],
  ENTERPRISE: ["whatsapp", "api_access", "webhooks", "recoveries", "sso", "dedicated_ip"],
};

export const PLAN_CATALOG: Record<PlanTier, { features: readonly string[] }> = {
  FREE: {
    features: [
      "1 000 contacts",
      "5 000 emails par mois",
      "3 campagnes actives",
      "1 automation, 3 segments et 10 snippets",
      "1 domaine d’envoi",
      "Analytics essentiels",
    ],
  },
  PRO: {
    features: [
      "25 000 contacts",
      "Emails, campagnes, automations, segments et snippets illimités",
      "Domaines d’envoi illimités",
      "Campagnes WhatsApp",
      "API et webhooks",
      "Recouvrements et support prioritaire",
    ],
  },
  ENTERPRISE: {
    features: [
      "Tout le plan Pro",
      "Contacts illimités",
      "IP dédiée et SSO/SAML sur devis",
      "Accompagnement et SLA contractuel",
    ],
  },
};

const FEATURE_LABELS: Record<PlanFeature, string> = {
  whatsapp: "WhatsApp",
  api_access: "l’API MailPulse",
  webhooks: "les webhooks",
  recoveries: "les recouvrements",
  sso: "le SSO/SAML",
  dedicated_ip: "l’IP dédiée",
};

export function canAccessFeature(plan: PlanTier, feature: PlanFeature): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

export function getFeatureUpgradeMessage(feature: PlanFeature): string {
  return `${FEATURE_LABELS[feature]} nécessite le plan Pro. Vos données restent visibles et seront réactivées après la mise à niveau.`;
}

export function getPlanLimits(plan: PlanTier) {
  return PLAN_LIMITS[plan];
}
