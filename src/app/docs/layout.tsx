"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mail,
  ArrowLeft,
  BookOpen,
  Code,
  Webhook,
  Zap,
  Settings,
  Users,
  BarChart3,
  Menu,
  X,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "Demarrage",
    items: [
      { title: "Introduction", href: "/docs", icon: BookOpen },
      { title: "Installation", href: "/docs/installation", icon: Code },
      { title: "Premiere campagne", href: "/docs/first-campaign", icon: Send },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "Contacts & Listes", href: "/docs/contacts", icon: Users },
      { title: "Campagnes", href: "/docs/campaigns", icon: Mail },
      { title: "Automations", href: "/docs/automations", icon: Zap },
      { title: "Analytics", href: "/docs/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "API Reference",
    items: [
      { title: "Authentification", href: "/docs/api/auth", icon: Settings },
      { title: "Endpoints", href: "/docs/api/endpoints", icon: Code },
      { title: "Webhooks & Tracking", href: "/docs/api/webhooks", icon: Webhook },
    ],
  },
];

function SidebarContent({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="p-5 border-b border-zinc-800/50">
        <Link href="/" className="flex items-center gap-2.5 group mb-4 cursor-pointer">
          <Mail className="h-5 w-5 text-orange-500" />
          <span
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Mail<span className="text-orange-500">Pulse</span>
          </span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour au site
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.15em] mb-2 px-2">
              {section.title}
            </h4>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all cursor-pointer",
                      isActive
                        ? "bg-orange-500/10 text-orange-400 border border-orange-500/10"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-800/50">
        <a
          href="https://github.com/James10192/mailpulse"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4 fill-current"
            aria-hidden="true"
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          Voir sur GitHub
        </a>
      </div>
    </>
  );
}

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-zinc-950">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl h-14 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 cursor-pointer">
          <Mail className="h-5 w-5 text-orange-500" />
          <span
            className="text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Mail<span className="text-orange-500">Pulse</span>
          </span>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-all cursor-pointer"
        >
          {sidebarOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm cursor-pointer"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar drawer */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950 border-r border-zinc-800/50 flex flex-col transform transition-transform duration-300 ease-in-out pt-14",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent
          pathname={pathname}
          onNavigate={() => setSidebarOpen(false)}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 border-r border-zinc-800/50 flex-col fixed inset-y-0 left-0 z-40">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Content */}
      <main className="flex-1 lg:pl-72 pt-14 lg:pt-0">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-16">
          {children}
        </div>
      </main>
    </div>
  );
}
