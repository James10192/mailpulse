"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  LogOut,
  ChevronDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, useSession } from "@/lib/auth-client";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/dashboard/sidebar-context";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { CommandPalette, useShortcutLabel } from "@/components/dashboard/command-palette";
import { NotificationsDropdown } from "@/components/dashboard/notifications-dropdown";
import { PresenceHeartbeat, OnlineUsers } from "@/components/dashboard/presence-indicator";
import { TourButton, AutoTour } from "@/components/dashboard/app-tour";
import { WhatsNewModal, WhatsNewButton } from "@/components/dashboard/whats-new-modal";
import { ShowChecklistButton } from "@/components/dashboard/onboarding-checklist";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Send,
  Users,
  BarChart3,
  Zap,
  Settings,
  Tag,
  Filter,
  FormInput,
  Globe,
  AtSign,
  Calendar,
  Code,
  SendHorizonal,
  UserMinus,
  MessageSquare,
  HandCoins,
  Network,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  pro?: boolean;
  tourId?: string;
  children?: { name: string; href: string; icon: LucideIcon; pro?: boolean }[];
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Campagnes",
    href: "/dashboard/campaigns",
    icon: Send,
    tourId: "nav-campaigns",
    children: [
      { name: "Toutes", href: "/dashboard/campaigns", icon: Send },
      { name: "Snippets", href: "/dashboard/snippets", icon: Code },
      { name: "Calendrier", href: "/dashboard/calendar", icon: Calendar },
    ],
  },
  {
    name: "Contacts",
    href: "/dashboard/contacts",
    icon: Users,
    tourId: "nav-contacts",
    children: [
      { name: "Tous", href: "/dashboard/contacts", icon: Users },
      { name: "Tags", href: "/dashboard/tags", icon: Tag },
      { name: "Champs", href: "/dashboard/fields", icon: FormInput },
      { name: "Segments", href: "/dashboard/segments", icon: Filter },
    ],
  },
  {
    name: "Emails",
    href: "/dashboard/transactional",
    icon: Mail,
    children: [
      { name: "Transactional", href: "/dashboard/transactional", icon: SendHorizonal },
      { name: "Unsubscribes", href: "/dashboard/unsubscribes", icon: UserMinus },
    ],
  },
  { name: "WhatsApp", href: "/dashboard/messaging", icon: MessageSquare, pro: true, tourId: "nav-messaging" },
  { name: "Recouvrements", href: "/dashboard/recoveries", icon: HandCoins, pro: true },
  { name: "Platform", href: "/dashboard/platform", icon: Network, pro: true },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, tourId: "nav-analytics" },
  { name: "Pages de capture", href: "/dashboard/capture-pages", icon: Globe, tourId: "nav-capture" },
  { name: "Automations", href: "/dashboard/automations", icon: Zap, pro: true, tourId: "nav-automations" },
  {
    name: "Envoi",
    href: "/dashboard/senders",
    icon: AtSign,
    tourId: "nav-senders",
    children: [
      { name: "Expéditeurs", href: "/dashboard/senders", icon: AtSign },
      { name: "Domaines", href: "/dashboard/domains", icon: Globe },
    ],
  },
  { name: "Paramètres", href: "/dashboard/settings", icon: Settings, tourId: "nav-settings" },
];

function SidebarNavItem({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));
  const hasChildren = item.children && item.children.length > 0;
  const isChildActive = hasChildren && item.children!.some((c) => pathname === c.href);
  const [expanded, setExpanded] = useState(isActive || isChildActive);

  if (hasChildren && !collapsed) {
    return (
      <div data-tour={item.tourId}>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "h-auto w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm",
            isActive || isChildActive
              ? "bg-orange-500/10 text-orange-600 hover:bg-orange-500/10 dark:text-orange-400"
              : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.name}</span>
          {item.pro && (
            <Badge variant="default" className="px-1 py-0 text-[8px] uppercase">Pro</Badge>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              expanded ? "rotate-0" : "-rotate-90"
            )}
          />
        </Button>
        {expanded && (
          <div className="mt-0.5 space-y-0.5 border-l border-zinc-200 pl-3 ml-4 dark:border-zinc-800">
            {item.children!.map((child) => {
              const childActive = pathname === child.href;
              return (
                <Button
                  key={child.href}
                  asChild
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 w-full justify-start gap-2.5 px-2.5 text-xs",
                    childActive
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "text-zinc-500 dark:text-zinc-400"
                  )}
                >
                  <Link href={child.href}>
                    <child.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1">{child.name}</span>
                    {child.pro && <Badge variant="default" className="px-1 py-0 text-[7px] uppercase">Pro</Badge>}
                  </Link>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(
        "h-auto w-full gap-3 rounded-lg text-sm",
        collapsed ? "justify-center p-2.5" : "justify-start px-3 py-2",
        isActive
          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
          : "text-zinc-500 dark:text-zinc-400"
      )}
    >
      <Link href={item.href} title={collapsed ? item.name : undefined} data-tour={item.tourId}>
        <item.icon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.pro && <Badge variant="default" className="px-1 py-0 text-[8px] uppercase">Pro</Badge>}
          </>
        )}
      </Link>
    </Button>
  );
}

function SidebarSectionSeparator() {
  return (
    <div className="px-2">
      <Separator />
    </div>
  );
}
function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  return (
    <aside
      data-tour="sidebar"
      style={{ viewTransitionName: "persistent-sidebar" }}
      className={cn(
        "hidden h-screen flex-col border-r border-zinc-200 bg-white text-zinc-900 transition-all duration-300 ease-in-out dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center shrink-0",
          collapsed ? "justify-center px-3" : "px-4"
        )}
      >
        <BrandMark href="/dashboard" compact={collapsed} className="text-base" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => (
          <SidebarNavItem key={item.name} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="space-y-2 p-2">
        <SidebarSectionSeparator />
        <SidebarToggle />

        {/* Logout */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
          className={cn(
            "h-auto w-full gap-3 rounded-lg text-sm text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-500/10 dark:hover:text-red-400",
            collapsed ? "justify-center p-2.5" : "justify-start px-3 py-2"
          )}
          title={collapsed ? "Déconnexion" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </Button>
      </div>
    </aside>
  );
}

function SearchTrigger() {
  const shortcutLabel = useShortcutLabel();
  return (
    <Button
      type="button"
      variant="outline"
      data-tour="search"
      onClick={() => document.dispatchEvent(new Event("open-command-palette"))}
      className="hidden h-9 items-center gap-2 border-zinc-200 bg-white px-3 text-sm text-zinc-500 hover:text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 md:flex"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Rechercher...</span>
      <Kbd className="ml-4">{shortcutLabel}</Kbd>
    </Button>
  );
}

function HeaderAvatar() {
  const { data: session } = useSession();
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <Link href="/dashboard/settings" title="Paramètres">
      <Avatar className="h-8 w-8">
        {session?.user?.image ? <AvatarImage src={session.user.image} alt="" /> : null}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
    </Link>
  );
}
function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <PresenceHeartbeat />
      <Sidebar />
      <MobileNav navigation={navigation} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header
          style={{ viewTransitionName: "persistent-header" }}
          className="mt-14 flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-950 md:mt-0 md:px-6"
        >
          <SearchTrigger />
          <div className="md:hidden" />

          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <OnlineUsers />
            <div data-tour="theme"><ThemeToggle /></div>
            <ShowChecklistButton />
            <TourButton />
            <WhatsNewButton />
            <div data-tour="notifications"><NotificationsDropdown /></div>
            <HeaderAvatar />
          </div>
        </header>

        <CommandPalette />

        <main className="flex-1 overflow-y-auto bg-zinc-50 p-4 dark:bg-zinc-950 md:p-6">
          {children}
        </main>
      </div>

      <AutoTour />
      <WhatsNewModal />
    </div>
  );
}

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <DashboardContent>{children}</DashboardContent>
    </SidebarProvider>
  );
}
