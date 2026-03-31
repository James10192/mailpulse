export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: "feature" | "fix" | "improvement";
    text: string;
  }[];
}

export const APP_VERSION = "0.5.0";

export const changelog: ChangelogEntry[] = [
  {
    version: "0.5.0",
    date: "2026-03-30",
    title: "Campagnes avancees & Tracking",
    changes: [
      { type: "feature", text: "Vue detail campagne en split-panel (comme Lumail)" },
      { type: "feature", text: "Editeur riche pour les campagnes avec autosave" },
      { type: "feature", text: "Tracking email: taux d'ouverture et taux de clic en temps reel" },
      { type: "feature", text: "Webhooks Resend: delivered, opened, clicked, bounced" },
      { type: "feature", text: "Page de contact hybride (formulaire + email direct)" },
      { type: "feature", text: "Guide interactif et What's New" },
      { type: "improvement", text: "Expediteurs: modal d'edition + email split nom@domaine" },
      { type: "improvement", text: "Page d'envoi: toggle pills pour audience et expediteur" },
      { type: "improvement", text: "Images centrees dans les emails envoyes (Gmail, Outlook)" },
      { type: "fix", text: "Billing: campagnes actives ne comptent plus les envoyees" },
      { type: "fix", text: "Webhook Resend: format tags objet corrige" },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-03-29",
    title: "OAuth, Passkeys & Envoi",
    changes: [
      { type: "feature", text: "OAuth linking: Google + GitHub (lier/delier)" },
      { type: "feature", text: "Passkeys: Windows Hello, Touch ID, YubiKey" },
      { type: "feature", text: "Envoi de campagnes par batch via Resend API" },
      { type: "feature", text: "Planification d'envoi avec date et heure" },
      { type: "feature", text: "Import CSV contacts (upload, mapping, import)" },
      { type: "feature", text: "Segmentation dynamique avec filtres" },
      { type: "improvement", text: "Filtres avances sur contacts, campagnes, segments, tags" },
      { type: "improvement", text: "ConfirmDialog remplace window.confirm() partout" },
      { type: "fix", text: "Auth reelle Better Auth (plus de stub findFirst)" },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-03-28",
    title: "Editeur & Capture Pages",
    changes: [
      { type: "feature", text: "Editeur TipTap riche: couleurs, tailles, tableaux, images" },
      { type: "feature", text: "Snippets avec autosave et preview iframe" },
      { type: "feature", text: "Pages de capture avec formulaire builder et analytics" },
      { type: "feature", text: "Champs personnalises (7 types de champs)" },
      { type: "feature", text: "Domaines Resend: creation, DNS records, verification" },
      { type: "feature", text: "Page detail contact avec timeline d'activite" },
      { type: "improvement", text: "Workflow builder React Flow avec undo/redo" },
      { type: "fix", text: "React Flow: edges invisibles, handles, auto-connect" },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-03-27",
    title: "Dashboard & Analytics",
    changes: [
      { type: "feature", text: "Dashboard temps reel avec Convex" },
      { type: "feature", text: "Notifications avec badge de non-lus" },
      { type: "feature", text: "Presence en temps reel (avatars en ligne)" },
      { type: "feature", text: "PostHog analytics: 28 events, dashboard, funnels" },
      { type: "feature", text: "Paywall complet: limites FREE/PRO/ENTERPRISE" },
      { type: "feature", text: "Cmd+K palette de recherche" },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-03-27",
    title: "Lancement initial",
    changes: [
      { type: "feature", text: "Landing page premium avec pricing FCFA" },
      { type: "feature", text: "Auth: inscription, connexion, Google/GitHub OAuth" },
      { type: "feature", text: "Onboarding 5 etapes" },
      { type: "feature", text: "CRUD contacts, campagnes, automations" },
      { type: "feature", text: "9 pages de documentation" },
    ],
  },
];
