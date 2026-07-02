"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/dashboard/dashboard-shell";

export function MobileNav({ navigation }: { navigation: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-zinc-200 bg-white/95 px-4 text-zinc-900 backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 dark:text-zinc-100 md:hidden">
        <BrandMark href="/dashboard" className="text-base" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(!open)}
          className="text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          aria-expanded={open}
          aria-label="Ouvrir le menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-zinc-200 bg-white pt-14 text-zinc-900 transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 md:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="p-3 space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  isActive
                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.name}</span>
                {item.pro && (
                  <span className="ml-auto rounded border border-orange-500/20 bg-orange-500/10 px-1 py-0.5 text-[8px] font-bold uppercase text-orange-500">
                    Pro
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
