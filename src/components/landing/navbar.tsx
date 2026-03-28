"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Menu, X, BookOpen, User } from "lucide-react";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-5 w-5"} fill="currentColor" aria-hidden="true">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Tracking", href: "#tracking" },
  { label: "Pricing", href: "#pricing" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-white/5 backdrop-blur-xl bg-zinc-950/80">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <Mail className="h-5 w-5 text-orange-500 transition-transform group-hover:scale-110" />
            <div className="absolute inset-0 bg-orange-500/20 blur-lg rounded-full" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Mail<span className="text-orange-500">Pulse</span>
          </span>
        </Link>

        {/* Desktop nav links (center) */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-zinc-100 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Right section: icon buttons + auth */}
        <div className="flex items-center gap-2">
          {/* Icon buttons — always visible */}
          <Link
            href="/docs"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
            title="Documentation"
          >
            <BookOpen className="h-[18px] w-[18px]" />
          </Link>
          <a
            href="https://github.com/James10192/mailpulse"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
            title="GitHub"
          >
            <GitHubIcon className="h-[18px] w-[18px]" />
          </a>

          {/* Separator */}
          <div className="hidden md:block w-px h-5 bg-zinc-800 mx-1" />

          {/* Connexion icon — mobile only */}
          <Link
            href="/login"
            className="md:hidden p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
            title="Connexion"
          >
            <User className="h-[18px] w-[18px]" />
          </Link>

          {/* Auth buttons — desktop only */}
          <Link
            href="/login"
            className="hidden md:block text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="hidden md:block text-sm bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-all hover:shadow-lg hover:shadow-orange-500/20"
          >
            Demarrer
          </Link>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-all ml-1"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu — only page links + auth buttons (no Docs/GitHub duplication) */}
      {open && (
        <div className="md:hidden border-t border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl">
          <div className="px-6 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block py-2.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                {link.label}
              </a>
            ))}

            <div className="pt-3 mt-3 border-t border-zinc-800/50 space-y-2">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block text-center py-2.5 text-sm text-zinc-300 border border-zinc-800 rounded-lg hover:bg-zinc-900 transition-colors"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="block text-center py-2.5 text-sm text-white bg-orange-600 hover:bg-orange-500 rounded-lg transition-colors font-medium"
              >
                Demarrer gratuitement
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
