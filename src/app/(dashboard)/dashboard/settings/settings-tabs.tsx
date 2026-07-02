"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, PlugZap, Settings } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      role="tablist"
      className="flex w-full gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-900/50"
    >
      {settingsTabs.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== "/dashboard/settings" && pathname.startsWith(tab.href));

        return (
          <Button
            key={tab.href}
            asChild
            variant={active ? "default" : "ghost"}
            className={cn(
              "h-10 shrink-0 justify-start rounded-md px-3",
              !active &&
                "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
            )}
          >
            <Link href={tab.href} role="tab" aria-selected={active}>
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
