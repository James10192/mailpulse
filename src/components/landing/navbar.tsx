"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";

import { BrandMark } from "@/components/brand-mark";

const links = [
  { label: "Produit", href: "#plateforme" },
  { label: "Fonctionnement", href: "#fonctionnement" },
  { label: "Développeurs", href: "#developpeurs" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "Docs", href: "/docs" },
];

/** The real MailPulse mark (BrandMark), sized for the landing chrome. */
export function Logo() {
  return (
    <BrandMark
      className="min-h-11 text-[15px] tracking-[-0.02em] text-zinc-50 hover:text-zinc-50"
      logoClassName="h-8 w-14"
      logoSizes="56px"
    />
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  // Full-screen mobile menu: Escape closes, content behind becomes inert, no scroll bleed.
  useEffect(() => {
    if (!open) return;
    const main = document.getElementById("mp-main");
    const footer = document.getElementById("mp-footer");
    main?.setAttribute("inert", "");
    footer?.setAttribute("inert", "");
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      main?.removeAttribute("inert");
      footer?.removeAttribute("inert");
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-50">
      <div
        className={`border-b bg-zinc-950/70 backdrop-blur-md transition-colors duration-200 ${
          scrolled || open ? "border-white/[0.06]" : "border-transparent"
        }`}
      >
        <nav
          aria-label="Navigation principale"
          className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-4 px-4 md:px-6 lg:px-8"
        >
          <Logo />

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-flex min-h-11 items-center px-3 text-sm text-zinc-400 transition-colors duration-150 hover:text-zinc-50"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <Link
              href="/login"
              className="hidden min-h-11 items-center px-3 text-sm text-zinc-400 transition-colors duration-150 hover:text-zinc-50 md:inline-flex"
            >
              Se connecter
            </Link>
            <Link
              href="/login"
              className="inline-flex h-9 items-center rounded-[10px] bg-zinc-50 px-3.5 text-sm font-medium text-zinc-950 transition-[background-color,scale] duration-150 hover:bg-white active:scale-[0.985]"
            >
              Commencer
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-expanded={open}
              aria-controls="mp-mobile-menu"
              aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
              className="-mr-2 inline-flex size-11 items-center justify-center rounded-[10px] text-zinc-300 transition-colors hover:text-zinc-50 lg:hidden"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open ? (
          <m.div
            id="mp-mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-14 bottom-0 z-50 flex flex-col overflow-y-auto bg-zinc-950 px-4 pb-8 pt-6 md:px-6 lg:hidden"
          >
            <ul className="flex flex-col">
              {links.map((link) => (
                <li key={link.href} className="border-b border-white/[0.06]">
                  <a
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-14 items-center text-2xl font-medium tracking-[-0.02em] text-zinc-100"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-auto grid gap-3 pt-8">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-12 items-center justify-center rounded-[10px] border border-white/[0.1] text-[15px] font-medium text-zinc-200"
              >
                Se connecter
              </Link>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex min-h-12 items-center justify-center rounded-[10px] bg-orange-500 text-[15px] font-medium text-zinc-950"
              >
                Commencer gratuitement
              </Link>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
