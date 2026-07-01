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
  PlugZap,
} from "lucide-react";

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
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, tourId: "nav-analytics" },
  { name: "Pages de capture", href: "/dashboard/capture-pages", icon: Globe, tourId: "nav-capture" },
  { name: "Automations", href: "/dashboard/automations", icon: Zap, pro: true, tourId: "nav-automations" },
  {
    name: "Envoi",
    href: "/dashboard/senders",
    icon: AtSign,
    tourId: "nav-senders",
    children: [
      { name: "Expediteurs", href: "/dashboard/senders", icon: AtSign },
      { name: "Domaines", href: "/dashboard/domains", icon: Globe },
    ],
  },
  { name: "Parametres", href: "/dashboard/settings", icon: Settings, tourId: "nav-settings" },
  { name: "Integrations", href: "/dashboard/settings/integrations", icon: PlugZap },
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
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm transition-all w-full px-3 py-2 cursor-pointer",
            isActive || isChildActive
              ? "text-orange-600 dark:text-orange-400"
              : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.name}</span>
          {item.pro && (
            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">Pro</span>
          )}
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200",
              expanded ? "rotate-0" : "-rotate-90"
            )}
          />
        </button>
        {expanded && (
          <div className="ml-4 pl-3 border-l border-zinc-200 dark:border-zinc-800 space-y-0.5 mt-0.5">
            {item.children!.map((child) => {
              const childActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs transition-all",
                    childActive
                      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                      : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  )}
                >
                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1">{child.name}</span>
                  {child.pro && (
                    <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">Pro</span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      title={collapsed ? item.name : undefined}
      data-tour={item.tourId}
      className={cn(
        "flex items-center gap-3 rounded-lg text-sm transition-all",
        collapsed ? "p-2.5 justify-center" : "px-3 py-2",
        isActive
          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
          : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      )}
    >
      <item.icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.name}</span>
          {item.pro && (
            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase">Pro</span>
          )}
        </>
      )}
    </Link>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { collapsed } = useSidebar();

  return (
    <aside
      data-tour="sidebar"
      className={cn(
        "hidden md:flex border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex-col transition-all duration-300 ease-in-out shrink-0",
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
        <Link href="/dashboard" className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-orange-500 shrink-0" />
          {!collapsed && (
            <span className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Mail<span className="text-orange-500">Pulse</span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => (
          <SidebarNavItem key={item.name} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-2 space-y-1 border-t border-zinc-200 dark:border-zinc-800">
        <SidebarToggle />

        {/* Logout */}
        <button
          onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login"; } } })}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all w-full cursor-pointer",
            collapsed ? "p-2.5 justify-center" : "px-3 py-2"
          )}
          title={collapsed ? "Deconnexion" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Deconnexion</span>}
        </button>
      </div>
    </aside>
  );
}

function SearchTrigger() {
  const shortcutLabel = useShortcutLabel();
  return (
    <button
      data-tour="search"
      onClick={() => document.dispatchEvent(new Event("open-command-palette"))}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer text-sm"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Rechercher...</span>
      <kbd className="ml-4 text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">{shortcutLabel}</kbd>
    </button>
  );
}

function HeaderAvatar() {
  const { data: session } = useSession();
  return (
    <Link href="/dashboard/settings" title="Parametres">
      {session?.user?.image ? (
        <img
          src={session.user.image}
          alt=""
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center text-sm font-medium">
          {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </Link>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <PresenceHeartbeat />
      <Sidebar />
      <MobileNav navigation={navigation} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950 shrink-0 mt-14 md:mt-0">
          <SearchTrigger />
          <div className="md:hidden" />

          <div className="flex items-center gap-3">
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

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-100/50 dark:bg-zinc-950">
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
