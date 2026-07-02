"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, PlugZap, Settings } from "lucide-react";

import { cn } from "@/lib/utils";

const settingsTabs = [
  { label: "Général", href: "/dashboard/settings", icon: Settings },
  { label: "Intégrations", href: "/dashboard/settings/integrations", icon: PlugZap },
  { label: "Facturation", href: "/dashboard/settings/billing", icon: CreditCard },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections des paramètres"
      className="flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      {settingsTabs.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== "/dashboard/settings" && pathname.startsWith(tab.href));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors",
              active
                ? "bg-orange-500 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
