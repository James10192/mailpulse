"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Plug, PlugZap, Settings } from "lucide-react";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const settingsLinks = [
  { label: "Général", href: "/dashboard/settings", icon: Settings },
  { label: "Intégrations", href: "/dashboard/settings/integrations", icon: PlugZap },
  { label: "Applications externes", href: "/dashboard/settings/external-applications", icon: Plug },
  { label: "Facturation", href: "/dashboard/settings/billing", icon: CreditCard },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/settings") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto">
      <NavigationMenu viewport={false} className="max-w-none justify-start">
        <NavigationMenuList className="justify-start gap-1">
          {settingsLinks.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);

            return (
              <NavigationMenuItem key={item.href}>
                <NavigationMenuLink
                  asChild
                  active={active}
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "h-11 gap-2 bg-transparent px-3 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                    active &&
                      "bg-zinc-100 text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50",
                  )}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  );
}
