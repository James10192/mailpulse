"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Menu, User, X } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const navLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Tracking", href: "#tracking" },
  { label: "Tarifs", href: "#pricing" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-zinc-950/90 text-zinc-100 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <BrandMark className="text-lg text-zinc-50" />

        <nav className="hidden items-center gap-8 text-sm text-zinc-400 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-zinc-100">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Button asChild variant="ghost" size="icon" className="text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-100" title="Documentation">
            <Link href="/docs">
              <BookOpen className="h-[18px] w-[18px]" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-100" title="GitHub">
            <a href="https://github.com/James10192/mailpulse" target="_blank" rel="noopener noreferrer">
              <GitHubIcon className="h-[18px] w-[18px]" />
            </a>
          </Button>

          <div className="mx-1 hidden h-5 w-px bg-zinc-800 md:block" />

          <Button asChild variant="ghost" size="icon" className="text-zinc-500 hover:bg-zinc-800/70 hover:text-zinc-100 md:hidden" title="Connexion">
            <Link href="/login">
              <User className="h-[18px] w-[18px]" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="hidden text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100 md:inline-flex">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild className="hidden md:inline-flex">
            <Link href="/register">Démarrer</Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen((value) => !value)}
            className="ml-1 text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-100 md:hidden"
            aria-expanded={open}
            aria-label="Ouvrir le menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-zinc-800/80 bg-zinc-950/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <nav className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-zinc-50"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid gap-2 border-t border-zinc-800 pt-3">
            <Button asChild variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900">
              <Link href="/login" onClick={() => setOpen(false)}>
                Connexion
              </Link>
            </Button>
            <Button asChild>
              <Link href="/register" onClick={() => setOpen(false)}>
                Démarrer gratuitement
              </Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
