"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Code,
  Filter,
  FormInput,
  Globe,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquare,
  Network,
  Search,
  Send,
  SendHorizonal,
  Settings,
  Tag,
  UserMinus,
  Users,
  Zap,
} from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { AutoTour, TourButton } from "@/components/dashboard/app-tour";
import { CommandPalette, useShortcutLabel } from "@/components/dashboard/command-palette";
import { FeedbackWidget } from "@/components/dashboard/feedback-widget";
import { NotificationsDropdown } from "@/components/dashboard/notifications-dropdown";
import { ShowChecklistButton } from "@/components/dashboard/onboarding-checklist";
import { OnlineUsers, PresenceHeartbeat } from "@/components/dashboard/presence-indicator";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { WhatsNewButton, WhatsNewModal } from "@/components/dashboard/whats-new-modal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  pro?: boolean;
  adminOnly?: boolean;
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
      { name: "Transactionnels", href: "/dashboard/transactional", icon: SendHorizonal },
      { name: "Désabonnements", href: "/dashboard/unsubscribes", icon: UserMinus },
    ],
  },
  { name: "WhatsApp", href: "/dashboard/messaging", icon: MessageSquare, pro: true, tourId: "nav-messaging" },
  { name: "Recouvrements", href: "/dashboard/recoveries", icon: HandCoins, pro: true },
  { name: "Plateforme", href: "/dashboard/platform", icon: Network, pro: true },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, tourId: "nav-analytics" },
  { name: "Pages de capture", href: "/dashboard/capture-pages", icon: Globe, tourId: "nav-capture" },
  { name: "Automations", href: "/dashboard/automations", icon: Zap, pro: true, tourId: "nav-automations" },
  { name: "Administration", href: "/dashboard/admin", icon: Building2, adminOnly: true },
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

const navbarGroups = [
  {
    label: "Créer",
    items: [
      { name: "Campagne", href: "/dashboard/campaigns/new", icon: Send },
      { name: "Importer des contacts", href: "/dashboard/contacts/import", icon: Users },
      { name: "Page de capture", href: "/dashboard/capture-pages", icon: Globe },
    ],
  },
  {
    label: "Suivi",
    items: [
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { name: "Plateforme", href: "/dashboard/platform", icon: Network },
      { name: "Recouvrements", href: "/dashboard/recoveries", icon: HandCoins },
    ],
  },
  {
    label: "Réglages",
    items: [
      { name: "Expéditeurs", href: "/dashboard/senders", icon: AtSign },
      { name: "Domaines", href: "/dashboard/domains", icon: Globe },
      { name: "Paramètres", href: "/dashboard/settings", icon: Settings },
      { name: "Administration", href: "/dashboard/admin", icon: Building2, adminOnly: true },
    ],
  },
];

const dashboardPrefetchHrefs = Array.from(
  new Set([
    ...navigation.map((item) => item.href),
    ...navigation.flatMap((item) => item.children?.map((child) => child.href) ?? []),
    ...navbarGroups.flatMap((group) => group.items.map((item) => item.href)),
  ])
);

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
}

function AppSidebarNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const { setOpenMobile } = useSidebar();
  const hasChildren = Boolean(item.children?.length);
  const childActive = item.children?.some((child) => pathname === child.href) ?? false;
  const active = isActiveRoute(pathname, item.href) || childActive;
  const [expanded, setExpanded] = useState(active);
  const Icon = item.icon;

  if (hasChildren) {
    return (
      <SidebarMenuItem data-tour={item.tourId}>
        <SidebarMenuButton
          type="button"
          isActive={active}
          tooltip={item.name}
          onClick={() => setExpanded((value) => !value)}
          className="h-9"
        >
          <Icon />
          <span>{item.name}</span>
          {item.pro ? <SidebarProBadge /> : null}
          <ChevronDown
            className={cn("ml-auto size-3 transition-transform", expanded ? "rotate-0" : "-rotate-90")}
          />
        </SidebarMenuButton>
        {expanded ? (
          <SidebarMenuSub>
            {item.children?.map((child) => {
              const ChildIcon = child.icon;
              const isChildActive = pathname === child.href;

              return (
                <SidebarMenuSubItem key={child.href}>
                  <SidebarMenuSubButton asChild isActive={isChildActive}>
                    <Link href={child.href} prefetch onClick={() => setOpenMobile(false)}>
                      <ChildIcon />
                      <span>{child.name}</span>
                      {child.pro ? <SidebarProBadge compact /> : null}
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        ) : null}
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active} tooltip={item.name} data-tour={item.tourId} className="h-9">
        <Link href={item.href} prefetch onClick={() => setOpenMobile(false)}>
          <Icon />
          <span>{item.name}</span>
          {item.pro ? <SidebarProBadge /> : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarProBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Badge
      variant="default"
      className={cn("ml-auto h-5 px-1.5 text-[8px] uppercase tracking-wide group-data-[collapsible=icon]:hidden", compact && "text-[7px]")}
    >
      Pro
    </Badge>
  );
}

function AppSidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === "collapsed";
  const visibleNavigation = navigation.filter((item) => !item.adminOnly || isAdmin);

  return (
    <Sidebar data-tour="sidebar" collapsible="icon" style={{ viewTransitionName: "persistent-sidebar" }}>
      <SidebarHeader className="h-16 justify-center bg-sidebar/95">
        <BrandMark href="/dashboard" compact={collapsed} className="px-2 text-base font-semibold" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavigation.map((item) => (
                <AppSidebarNavItem key={item.href} item={item} pathname={pathname} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton type="button" tooltip={collapsed ? "Ouvrir" : "Réduire"} onClick={toggleSidebar}>
              {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
              <span>Réduire</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip="Déconnexion"
              className="text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              onClick={() =>
                signOut({
                  fetchOptions: {
                    onSuccess: () => {
                      window.location.href = "/login";
                    },
                  },
                })
              }
            >
              <LogOut />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function DashboardNavbar({ isAdmin }: { isAdmin: boolean }) {
  return (
    <NavigationMenu viewport={false} className="hidden lg:flex">
      <NavigationMenuList>
        {navbarGroups.map((group) => (
          <NavigationMenuItem key={group.label}>
            <NavigationMenuTrigger className="h-9 bg-transparent px-3">{group.label}</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-64 gap-1 p-1">
                {group.items.filter((item) => !item.adminOnly || isAdmin).map((item) => {
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <NavigationMenuLink asChild>
                        <Link href={item.href} prefetch className="flex-row items-center gap-3">
                          <Icon className="size-4" />
                          <span>{item.name}</span>
                        </Link>
                      </NavigationMenuLink>
                    </li>
                  );
                })}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );
}

function SearchTrigger() {
  const shortcutLabel = useShortcutLabel();

  return (
    <Button
      type="button"
      variant="outline"
      data-tour="search"
      onClick={() => deferDashboardEvent("open-command-palette")}
      className="hidden h-10 min-w-64 items-center justify-start gap-2 px-3 text-sm text-muted-foreground md:flex xl:min-w-80"
    >
      <Search className="size-3.5" />
      <span>Rechercher...</span>
      <Kbd className="ml-4">{shortcutLabel}</Kbd>
    </Button>
  );
}

function deferDashboardEvent(name: string) {
  window.requestAnimationFrame(() => {
    window.setTimeout(() => document.dispatchEvent(new Event(name)), 0);
  });
}

function HeaderAvatar() {
  const { data: session } = useSession();
  const initial = session?.user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <Link href="/dashboard/settings" title="Paramètres">
      <Avatar className="size-8">
        {session?.user?.image ? <AvatarImage src={session.user.image} alt="" /> : null}
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>
    </Link>
  );
}

function HeaderFeedbackButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => deferDashboardEvent("open-feedback-widget")}
      className="hidden h-10 sm:inline-flex"
    >
      <MessageSquare className="size-4" />
      Avis
    </Button>
  );
}

function DashboardRoutePrefetcher({ isAdmin }: { isAdmin: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const hrefs = useMemo(
    () =>
      dashboardPrefetchHrefs.filter((href) => {
        if (href === pathname) return false;
        if (!isAdmin && href === "/dashboard/admin") return false;
        return true;
      }),
    [isAdmin, pathname]
  );

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    const schedule = () => {
      hrefs.forEach((href, index) => {
        const timer = window.setTimeout(() => {
          if (!cancelled) router.prefetch(href);
        }, 250 + index * 120);
        timers.push(timer);
      });
    };

    let idleId: number;
    let usedIdleCallback = false;

    if (typeof window.requestIdleCallback === "function") {
      usedIdleCallback = true;
      idleId = window.requestIdleCallback(schedule, { timeout: 1500 });
    } else {
      idleId = window.setTimeout(schedule, 700);
    }

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      if (usedIdleCallback && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      } else {
        window.clearTimeout(idleId);
      }
    };
  }, [hrefs, router]);

  return null;
}

function DashboardContent({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  return (
    <SidebarProvider>
      <DashboardRoutePrefetcher isAdmin={isAdmin} />
      <PresenceHeartbeat />
      <AppSidebar isAdmin={isAdmin} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <header
          style={{ viewTransitionName: "persistent-header" }}
          className="flex h-16 shrink-0 items-center justify-between gap-3 bg-white/92 px-3 shadow-[inset_0_-1px_0_rgba(24,24,27,0.1)] backdrop-blur md:px-6 dark:bg-zinc-950/88 dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]"
        >
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <SearchTrigger />
            <DashboardNavbar isAdmin={isAdmin} />
          </div>
          <div className="flex min-w-0 items-center gap-2 md:gap-3">
            <HeaderFeedbackButton />
            <OnlineUsers />
            <div data-tour="theme">
              <ThemeToggle />
            </div>
            <ShowChecklistButton />
            <TourButton />
            <WhatsNewButton />
            <div data-tour="notifications">
              <NotificationsDropdown />
            </div>
            <HeaderAvatar />
          </div>
        </header>
        <CommandPalette />
        <main className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,rgba(249,115,22,0.035),transparent_220px),#fafafa] p-4 dark:bg-[linear-gradient(180deg,rgba(249,115,22,0.055),transparent_240px),#09090b] md:p-6">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
        <FeedbackWidget />
        <AutoTour />
        <WhatsNewModal />
      </SidebarInset>
    </SidebarProvider>
  );
}

export function DashboardShell({ children, isAdmin }: { children: React.ReactNode; isAdmin: boolean }) {
  return <DashboardContent isAdmin={isAdmin}>{children}</DashboardContent>;
}
