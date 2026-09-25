import Link from "next/link";

import { PanneauMarque } from "./panneau-marque";

/**
 * The frame shared by the sign-in screens. Desktop: 50/50 split with the
 * animated brand panel. Tablet: a card with a thin brand band. Mobile: full
 * screen, form high enough that the keyboard never covers the button.
 */
export function EcranAuth({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-dvh bg-zinc-950 font-sans text-zinc-50 antialiased [color-scheme:dark]">
      <div className="grid min-h-dvh lg:grid-cols-2">
        <aside className="relative hidden overflow-hidden border-r border-white/[0.06] bg-zinc-900/40 lg:flex lg:flex-col">
          <div
            className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black,transparent)]"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-2.5 p-10">
            <Logo />
          </div>
          <div className="relative flex flex-1 items-center justify-center px-10">
            <PanneauMarque />
          </div>
          <div className="relative p-10">
            <p className="max-w-[360px] text-balance text-lg font-medium leading-snug tracking-[-0.02em] text-zinc-200">
              E-mail, WhatsApp et SMS. <span className="text-zinc-500">Un seul suivi, de l&apos;envoi à la réponse.</span>
            </p>
          </div>
        </aside>

        <main className="flex flex-col">
          <div className="flex items-center justify-between px-4 pt-6 sm:px-8 lg:hidden">
            <Logo />
          </div>
          <div className="flex flex-1 items-start justify-center px-4 pb-10 pt-[12vh] sm:px-8 md:items-center md:pt-10">
            <div className="w-full max-w-[400px] md:rounded-[20px] md:border md:border-white/[0.06] md:bg-zinc-900/40 md:p-10 md:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
              {children}
            </div>
          </div>
          <p className="px-4 pb-6 text-center text-xs text-zinc-600 sm:px-8">
            <Link href="/" className="hover:text-zinc-400">mailpulse</Link> · Données chiffrées en transit · Code à usage unique
          </p>
        </main>
      </div>
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.035] mix-blend-overlay print:hidden"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
        aria-hidden="true"
      />
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="inline-flex min-h-[44px] items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em] text-zinc-50">
      <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
        <span className="absolute inset-0 animate-ping rounded-full bg-orange-500/60 motion-reduce:hidden" />
        <span className="relative h-2.5 w-2.5 rounded-full bg-orange-500" />
      </span>
      MailPulse
    </Link>
  );
}
