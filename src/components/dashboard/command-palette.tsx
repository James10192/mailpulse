"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AtSign,
  BarChart3,
  Calendar,
  Code,
  Filter,
  Globe,
  LayoutDashboard,
  Plus,
  Send,
  Settings,
  Tag,
  Users,
  Zap,
} from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";

const pages = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Navigation" },
  { name: "Campagnes", href: "/dashboard/campaigns", icon: Send, group: "Navigation" },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users, group: "Navigation" },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, group: "Navigation" },
  { name: "Pages de capture", href: "/dashboard/capture-pages", icon: Globe, group: "Navigation" },
  { name: "Automations", href: "/dashboard/automations", icon: Zap, group: "Navigation" },
  { name: "Tags", href: "/dashboard/tags", icon: Tag, group: "Navigation" },
  { name: "Segments", href: "/dashboard/segments", icon: Filter, group: "Navigation" },
  { name: "Expéditeurs", href: "/dashboard/senders", icon: AtSign, group: "Navigation" },
  { name: "Domaines", href: "/dashboard/domains", icon: Globe, group: "Navigation" },
  { name: "Calendrier", href: "/dashboard/calendar", icon: Calendar, group: "Navigation" },
  { name: "Snippets", href: "/dashboard/snippets", icon: Code, group: "Navigation" },
  { name: "Paramètres", href: "/dashboard/settings", icon: Settings, group: "Navigation" },
  { name: "Nouvelle campagne", href: "/dashboard/campaigns/new", icon: Plus, group: "Actions" },
  { name: "Ajouter un contact", href: "/dashboard/contacts", icon: Plus, group: "Actions" },
] as const;

function useIsMac() {
  return useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  }, []);
}

export function useShortcutLabel() {
  const isMac = useIsMac();
  return isMac ? "⌘K" : "Ctrl+K";
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const shortcutLabel = useShortcutLabel();

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    function handleCustomOpen() {
      setOpen(true);
    }

    window.addEventListener("keydown", handleKey);
    document.addEventListener("open-command-palette", handleCustomOpen);
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.removeEventListener("open-command-palette", handleCustomOpen);
    };
  }, []);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[18%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Navigation rapide</DialogTitle>
          <DialogDescription>Rechercher une page ou lancer une action rapide.</DialogDescription>
        </DialogHeader>
        <Command label="Navigation rapide">
          <CommandInput placeholder="Rechercher une page, une action..." autoFocus />
          <CommandList className="max-h-[min(28rem,60vh)]">
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup heading="Navigation">
              {pages
                .filter((page) => page.group === "Navigation")
                .map((page) => (
                  <CommandItem key={page.href} value={page.name} onSelect={() => navigate(page.href)}>
                    <page.icon />
                    <span>{page.name}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions rapides">
              {pages
                .filter((page) => page.group === "Actions")
                .map((page) => (
                  <CommandItem key={page.name} value={page.name} onSelect={() => navigate(page.href)}>
                    <page.icon />
                    <span>{page.name}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
          <div className="flex min-h-10 items-center justify-between border-t border-zinc-200 px-3 text-[11px] text-zinc-500 dark:border-zinc-800">
            <span>Flèches pour naviguer · Entrée pour sélectionner · Esc pour fermer</span>
            <Kbd>{shortcutLabel}</Kbd>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
