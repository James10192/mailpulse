"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  LayoutDashboard,
  Send,
  Users,
  BarChart3,
  FileText,
  Zap,
  Settings,
  LogOut,
  Bell,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth-client";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/dashboard/sidebar-context";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { useState } from "react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Campagnes", href: "/dashboard/campaigns", icon: Send },
  { name: "Contacts", href: "/dashboard/contacts", icon: Users },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Templates", href: "/dashboard/templates", icon: FileText },
  { name: "Automations", href: "/dashboard/automations", icon: Zap },
  { name: "Parametres", href: "/dashboard/settings", icon: Settings },
];

function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        "hidden md:flex border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex-col transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "border-b border-zinc-200 dark:border-zinc-800 flex items-center",
          collapsed ? "p-3 justify-center" : "p-4"
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
      <nav className="flex-1 p-2 space-y-0.5">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-sm transition-all",
                collapsed ? "p-2.5 justify-center" : "px-3 py-2",
                isActive
                  ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="p-2 space-y-1 border-t border-zinc-200 dark:border-zinc-800">
        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all w-full"
          title={collapsed ? "Ouvrir" : "Reduire"}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4 mx-auto" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              <span>Reduire</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={() => signOut()}
          className={cn(
            "flex items-center gap-3 rounded-lg text-sm text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all w-full",
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

function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-orange-500" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            Mail<span className="text-orange-500">Pulse</span>
          </span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
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
          "md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 pt-14",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <nav className="p-3 space-y-0.5">
          {navigation.map((item) => {
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
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileNav />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white dark:bg-zinc-950 shrink-0 mt-14 md:mt-0">
          <div />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button className="relative text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-zinc-50 dark:bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
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
