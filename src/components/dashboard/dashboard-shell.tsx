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
  Code,
  CreditCard,
  Filter,
  FormInput,
  Globe,
  HandCoins,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  MessageSquare,
  Network,
  PlugZap,
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
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { canAccessFeature, type PlanFeature, type PlanTier } from "@/lib/plan-catalog";
import { cn } from "@/lib/utils";

export type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  premiumFeature?: PlanFeature;
  adminOnly?: boolean;
  tourId?: string;
  children?: { name: string; href: string; icon: LucideIcon }[];
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
  { name: "WhatsApp", href: "/dashboard/messaging", icon: MessageSquare, premiumFeature: "whatsapp", tourId: "nav-messaging" },
  { name: "Recouvrements", href: "/dashboard/recoveries", icon: HandCoins, premiumFeature: "recoveries" },
  { name: "Plateforme", href: "/dashboard/platform", icon: Network, premiumFeature: "api_access" },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3, tourId: "nav-analytics" },
  { name: "Pages de capture", href: "/dashboard/capture-pages", icon: Globe, tourId: "nav-capture" },
  { name: "Automations", href: "/dashboard/automations", icon: Zap, tourId: "nav-automations" },
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

function AppSidebarNavItem({ item, pathname, plan }: { item: NavItem; pathname: string; plan: PlanTier }) {
  const { setOpenMobile } = useSidebar();
  const hasChildren = Boolean(item.children?.length);
  const childActive = item.children?.some((child) => pathname === child.href) ?? false;
  const active = isActiveRoute(pathname, item.href) || childActive;
  const [expanded, setExpanded] = useState(active);
  const Icon = item.icon;
  const readOnly = item.premiumFeature ? !canAccessFeature(plan, item.premiumFeature) : false;
  const tooltip = readOnly ? `${item.name}, consultation uniquement avec votre plan Starter` : item.name;

  if (hasChildren) {
    return (
      <SidebarMenuItem data-tour={item.tourId}>
        <SidebarMenuButton
          type="button"
          isActive={active}
          tooltip={tooltip}
          onClick={() => setExpanded((value) => !value)}
          className="h-9"
        >
          <Icon />
          <span>{item.name}</span>
          {readOnly ? <SidebarReadOnlyBadge /> : null}
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
      <SidebarMenuButton asChild isActive={active} tooltip={tooltip} data-tour={item.tourId} className="h-9">
        <Link href={item.href} prefetch onClick={() => setOpenMobile(false)}>
          <Icon />
          <span>{item.name}</span>
          {readOnly ? <SidebarReadOnlyBadge /> : null}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function SidebarReadOnlyBadge() {
  return (
    <span className="ml-auto flex size-5 items-center justify-center text-muted-foreground group-data-[collapsible=icon]:hidden" aria-label="Consultation uniquement">
      <LockKeyhole className="size-3.5" aria-hidden="true" />
    </span>
  );
}

function AppSidebar({ isAdmin, plan }: { isAdmin: boolean; plan: PlanTier }) {
  const pathname = usePathname();
  const { state } = useSidebar();
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
                <AppSidebarNavItem key={item.href} item={item} pathname={pathname} plan={plan} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              tooltip="Déconnexion"
              className="text-muted-foreground transition-[color,background-color] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
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
      className="hidden h-10 w-[min(28vw,21rem)] min-w-64 items-center gap-3 px-3 text-sm text-muted-foreground transition-[scale,color,background-color,box-shadow] md:flex"
    >
      <Search className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 text-left">Rechercher...</span>
      <Kbd className="ml-auto shrink-0">{shortcutLabel}</Kbd>
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
  const name = session?.user?.name ?? "Compte MailPulse";
  const email = session?.user?.email ?? "";

  function handleSignOut() {
    signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/login";
        },
      },
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10 rounded-full transition-[scale,background-color,box-shadow] active:scale-[0.96]"
          aria-label="Ouvrir le menu du profil"
        >
          <Avatar className="size-8">
            {session?.user?.image ? <AvatarImage src={session.user.image} alt="" /> : null}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          {email ? <span className="block truncate text-xs font-normal text-muted-foreground">{email}</span> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
          <Link href="/dashboard/settings">
            <Settings className="size-4" />
            Paramètres
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
          <Link href="/dashboard/settings/billing">
            <CreditCard className="size-4" />
            Facturation
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="min-h-10 cursor-pointer">
          <Link href="/dashboard/settings/integrations">
            <PlugZap className="size-4" />
            Intégrations
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="min-h-10 cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-500/10 dark:focus:text-red-300"
          onSelect={handleSignOut}
        >
          <LogOut className="size-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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

function DashboardContent({ children, isAdmin, plan }: { children: React.ReactNode; isAdmin: boolean; plan: PlanTier }) {
  return (
    <SidebarProvider>
      <DashboardRoutePrefetcher isAdmin={isAdmin} />
      <PresenceHeartbeat />
      <AppSidebar isAdmin={isAdmin} plan={plan} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950">
        <header
          style={{ viewTransitionName: "persistent-header" }}
          className="flex h-16 shrink-0 items-center justify-between gap-3 bg-white/92 px-3 shadow-[inset_0_-1px_0_rgba(24,24,27,0.1)] backdrop-blur md:px-6 dark:bg-zinc-950/88 dark:shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]"
        >
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger className="size-10 shrink-0" />
            <SearchTrigger />
            <DashboardNavbar isAdmin={isAdmin} />
          </div>
          <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
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

export function DashboardShell({ children, isAdmin, plan }: { children: React.ReactNode; isAdmin: boolean; plan: PlanTier }) {
  return <DashboardContent isAdmin={isAdmin} plan={plan}>{children}</DashboardContent>;
}
