"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Send,
  Users,
  BarChart3,
  FileText,
  Zap,
  Settings,
  Tag,
  Filter,
  Globe,
  AtSign,
  Calendar,
  Code,
  Plus,
  Search,
} from "lucide-react";

const pages = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Navigation" },
  { name: "Campagnes", href: "/dashboard/campaigns", icon: Send, group: "Navigation" },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users, group: "Navigation" },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, group: "Navigation" },
  { name: "Templates", href: "/dashboard/templates", icon: FileText, group: "Navigation" },
  { name: "Automations", href: "/dashboard/automations", icon: Zap, group: "Navigation" },
  { name: "Tags", href: "/dashboard/tags", icon: Tag, group: "Navigation" },
  { name: "Segments", href: "/dashboard/segments", icon: Filter, group: "Navigation" },
  { name: "Expediteurs", href: "/dashboard/senders", icon: AtSign, group: "Navigation" },
  { name: "Domaines", href: "/dashboard/domains", icon: Globe, group: "Navigation" },
  { name: "Calendrier", href: "/dashboard/calendar", icon: Calendar, group: "Navigation" },
  { name: "Snippets", href: "/dashboard/snippets", icon: Code, group: "Navigation" },
  { name: "Parametres", href: "/dashboard/settings", icon: Settings, group: "Navigation" },
  { name: "Nouvelle campagne", href: "/dashboard/campaigns/new", icon: Plus, group: "Actions" },
  { name: "Ajouter un contact", href: "/dashboard/contacts", icon: Plus, group: "Actions" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div className="fixed inset-0 z-[61] flex items-start justify-center pt-[20vh] px-4">
        <Command
          className="w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl overflow-hidden"
          label="Navigation rapide"
        >
          <div className="flex items-center gap-3 px-4 border-b border-zinc-200 dark:border-zinc-800">
            <Search className="h-4 w-4 text-zinc-400 shrink-0" />
            <Command.Input
              placeholder="Rechercher une page, une action..."
              className="w-full py-3.5 text-sm bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-zinc-500">
              Aucun resultat.
            </Command.Empty>

            <Command.Group heading="Navigation" className="mb-2">
              <p className="px-2 py-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Navigation
              </p>
              {pages
                .filter((p) => p.group === "Navigation")
                .map((page) => (
                  <Command.Item
                    key={page.href}
                    value={page.name}
                    onSelect={() => navigate(page.href)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 cursor-pointer data-[selected=true]:bg-orange-500/10 data-[selected=true]:text-orange-600 dark:data-[selected=true]:text-orange-400 transition-colors"
                  >
                    <page.icon className="h-4 w-4 shrink-0" />
                    {page.name}
                  </Command.Item>
                ))}
            </Command.Group>

            <Command.Group heading="Actions" className="mb-2">
              <p className="px-2 py-1.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                Actions rapides
              </p>
              {pages
                .filter((p) => p.group === "Actions")
                .map((page) => (
                  <Command.Item
                    key={page.name}
                    value={page.name}
                    onSelect={() => navigate(page.href)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-300 cursor-pointer data-[selected=true]:bg-orange-500/10 data-[selected=true]:text-orange-600 dark:data-[selected=true]:text-orange-400 transition-colors"
                  >
                    <page.icon className="h-4 w-4 shrink-0" />
                    {page.name}
                  </Command.Item>
                ))}
            </Command.Group>
          </Command.List>

          <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between text-[10px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span>↑↓ naviguer</span>
              <span>↵ selectionner</span>
              <span>esc fermer</span>
            </div>
            <span className="font-mono">⌘K</span>
          </div>
        </Command>
      </div>
    </>
  );
}
