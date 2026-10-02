"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Phone, Smartphone } from "lucide-react";

import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { cn } from "@/lib/utils";

// One page for the phone channels: WhatsApp, SMS, and the numbers they leave from.
const tabs = [
  { label: "WhatsApp", href: "/dashboard/messaging", icon: MessageSquare },
  { label: "SMS", href: "/dashboard/messaging/sms", icon: Smartphone },
  {
    label: "Numéros",
    href: "/dashboard/messaging/numeros",
    icon: Phone,
  },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/dashboard/messaging") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MessagingTabs() {
  const pathname = usePathname();
  const current = tabs.find(({ href }) => isActive(pathname, href)) ?? tabs[0];
  return (
    <div>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Messagerie", href: "/dashboard/messaging" },
          { label: current.label },
        ]}
      />
      <nav aria-label="Messagerie" className="-mx-1 overflow-x-auto">
        <ul className="flex min-w-max gap-1 border-b border-zinc-200 px-1 dark:border-zinc-800">
          {tabs.map(({ label, href, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "-mb-px inline-flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                    active
                      ? "border-orange-500 text-zinc-950 dark:text-zinc-50"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
