import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { SettingsTabs } from "./settings-tabs";

const titles = {
  general: {
    breadcrumb: "Paramètres",
    title: "Paramètres",
    description: "Configuration de votre organisation et domaines d'envoi.",
  },
  integrations: {
    breadcrumb: "Intégrations",
    title: "Intégrations",
    description: "Connectez Filon à MailPulse pour préparer les relances de recouvrement.",
  },
  billing: {
    breadcrumb: "Facturation",
    title: "Abonnement & Facturation",
    description: "Gérez votre plan et suivez votre utilisation.",
  },
} as const;

export function SettingsPageFrame({
  section,
  children,
}: {
  section: keyof typeof titles;
  children: React.ReactNode;
}) {
  const copy = titles[section];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          section === "general"
            ? { label: copy.breadcrumb }
            : { label: "Paramètres", href: "/dashboard/settings" },
          ...(section === "general" ? [] : [{ label: copy.breadcrumb }]),
        ]}
      />
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {copy.description}
        </p>
      </div>
      <SettingsTabs />
      {children}
    </div>
  );
}
