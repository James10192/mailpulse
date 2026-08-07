import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { SettingsTabs } from "./settings-tabs";

const titles = {
  general: {
    breadcrumb: "Paramètres",
    title: "Paramètres",
    description: "Gérez votre profil, votre organisation et les accès de sécurité.",
  },
  integrations: {
    breadcrumb: "Intégrations",
    title: "Intégrations",
    description: "Connectez Filon à MailPulse pour préparer les relances de recouvrement.",
  },
  externalApplications: {
    breadcrumb: "Applications externes",
    title: "Applications externes",
    description:
      "Provisionnez les applications partenaires : credentials de commande, compte Meta WhatsApp, endpoints de rappel et templates.",
  },
  billing: {
    breadcrumb: "Facturation",
    title: "Abonnement et facturation",
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
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          section === "general"
            ? { label: copy.breadcrumb }
            : { label: "Paramètres", href: "/dashboard/settings" },
          ...(section === "general" ? [] : [{ label: copy.breadcrumb }]),
        ]}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {copy.description}
          </p>
        </div>
      </div>

      <SettingsTabs />

      <div className="min-w-0">{children}</div>
    </div>
  );
}
