"use client";

import { useRef, useState } from "react";
import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { Filter, GitBranch, Mail, MessageCircle, MessageSquareText, Tag, Timer, UserPlus } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE, StaggerItem } from "./reveal";
import { StatusPill, cardClass, type Status } from "./primitives";
import { useLoop } from "./use-loop";

/* ───────── Card with pointer-following glow ───────── */

export function BentoCard({
  className,
  title,
  text,
  children,
}: {
  className?: string;
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--x", `${event.clientX - rect.left}px`);
    ref.current.style.setProperty("--y", `${event.clientY - rect.top}px`);
  }

  return (
    <StaggerItem className={cn("min-w-0", className)}>
      <div
        ref={ref}
        onPointerMove={onPointerMove}
        className={cn(
          cardClass,
          "mp-spotlight flex h-full flex-col overflow-hidden transition-[border-color] duration-200 hover:border-white/[0.12]",
        )}
      >
        <div className="relative flex-1 p-5 md:p-6">{children}</div>
        <div className="relative border-t border-white/[0.05] p-5 md:p-6">
          <h3 className="text-lg font-semibold tracking-[-0.015em] text-zinc-50 md:text-xl">{title}</h3>
          <p className="mt-1.5 text-pretty text-[15px] leading-[1.6] text-zinc-400">{text}</p>
        </div>
      </div>
    </StaggerItem>
  );
}

/** Starts a tile's micro-animation only when half of it is visible. */
function useTileLoop(ms: number, tick: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.5 });
  useLoop(inView && !reduce, ms, tick);
  return { ref, inView, reduce };
}

/* ───────── 1. Channels: one message, three channels ───────── */

const TABS = [
  { key: "email", label: "E-mail", Icon: Mail },
  { key: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
  { key: "sms", label: "SMS", Icon: MessageSquareText },
] as const;

const PREFS = [
  { name: "Awa K.", channel: "whatsapp" },
  { name: "Karim T.", channel: "email" },
  { name: "Mariam D.", channel: "sms" },
] as const;

export function ChannelsMock() {
  const [tab, setTab] = useState(0);
  const { ref } = useTileLoop(3000, () => setTab((t) => (t + 1) % TABS.length));
  const current = TABS[tab].key;

  return (
    <div ref={ref} className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col rounded-[10px] border border-white/[0.06] bg-zinc-900 p-4">
        <div role="tablist" aria-label="Canal de l'aperçu" className="flex gap-1 rounded-lg bg-zinc-950/60 p-1">
          {TABS.map((t, i) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={i === tab}
              onClick={() => setTab(i)}
              className={cn(
                "relative flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors duration-150",
                i === tab ? "text-zinc-50" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {i === tab ? (
                <m.span
                  className="absolute inset-0 rounded-md bg-zinc-800"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15 }}
                />
              ) : null}
              <t.Icon aria-hidden className="relative size-3.5" />
              <span className="relative">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-1 flex-col gap-3 font-mono text-[12px]">
          <p className="text-zinc-500">
            Destinataires <span className="text-zinc-300">segment « Clients actifs »</span>
          </p>
          <div className="rounded-md border border-white/[0.06] bg-zinc-950/50 p-3 leading-relaxed text-zinc-300">
            Bonjour <span className="text-orange-300">{"{{prenom}}"}</span>, votre rendez-vous est confirmé pour{" "}
            <span className="text-orange-300">{"{{date}}"}</span>. Répondez OUI pour valider.
            <span className="mp-caret ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-orange-400" />
          </div>
          <p className="flex items-center justify-between text-zinc-500">
            <span>Variables : 2</span>
            <span>{current === "sms" ? "96 / 918 car." : "Aperçu à droite"}</span>
          </p>
          <div className="mt-auto border-t border-white/[0.06] pt-3">
            <p className="text-zinc-500">Canal préféré par contact</p>
            <ul className="mt-2 space-y-1">
              {PREFS.map((pref) => (
                <li
                  key={pref.name}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 transition-colors duration-200",
                    pref.channel === current ? "bg-orange-500/10 text-orange-200" : "text-zinc-400",
                  )}
                >
                  <span>{pref.name}</span>
                  <span>{TABS.find((t) => t.key === pref.channel)?.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative flex min-h-[200px] items-center justify-center rounded-[10px] border border-white/[0.06] bg-zinc-950/40 p-4">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={current}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="w-full max-w-[280px]"
          >
            {current === "email" ? (
              <div className="rounded-lg bg-zinc-100 p-4 text-zinc-800 shadow-lg">
                <p className="text-[11px] text-zinc-500">De : Votre équipe · À : awa@…</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">Votre rendez-vous est confirmé</p>
                <div className="mt-3 h-px bg-zinc-200" />
                <p className="mt-3 text-[13px] leading-relaxed">
                  Bonjour Awa, votre rendez-vous est confirmé pour le 14 mars.
                </p>
                <span className="mt-3 inline-flex rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white">
                  Voir le détail
                </span>
              </div>
            ) : current === "whatsapp" ? (
              <div className="space-y-2">
                <div className="ml-auto w-fit max-w-[92%] rounded-2xl rounded-tr-sm bg-zinc-700/80 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-50">
                  Bonjour Awa, votre rendez-vous est confirmé pour le 14 mars. Répondez OUI pour valider.
                  <span className="mt-1 block text-right font-mono text-[10px] text-zinc-400">09:41 · lu</span>
                </div>
                <div className="w-fit rounded-2xl rounded-tl-sm bg-zinc-800 px-3.5 py-2 text-[13px] text-zinc-100">
                  OUI
                  <span className="mt-1 block font-mono text-[10px] text-zinc-500">09:43</span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-zinc-800 px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-100">
                Bonjour Awa, votre rendez-vous est confirmé pour le 14 mars. Répondez OUI pour valider.
                <span className="mt-1 block font-mono text-[10px] text-zinc-500">SMS · 1 segment</span>
              </div>
            )}
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────── 2. Tracking: event feed ───────── */

const EVENTS: { status: Status; text: string }[] = [
  { status: "opened", text: "a•••@gmail.com · 3 s après l'envoi" },
  { status: "clicked", text: "lien « Voir le détail »" },
  { status: "delivered", text: "+225 07 •• •• 12" },
  { status: "failed", text: "rebond · adresse invalide" },
  { status: "read", text: "+225 01 •• •• 40 · WhatsApp" },
  { status: "opened", text: "k•••@yahoo.fr · iPhone" },
];

export function TrackingMock() {
  const [start, setStart] = useState(0);
  const { ref } = useTileLoop(2000, () => setStart((s) => (s + 1) % EVENTS.length));
  const visible = [0, 1, 2, 3].map((i) => ({ ...EVENTS[(start + i) % EVENTS.length], key: start + i }));

  return (
    <div ref={ref} className="h-[196px] overflow-hidden">
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {visible
            .slice()
            .reverse()
            .map((event) => (
              <m.li
                key={event.key}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="flex items-center gap-2.5 rounded-md border border-white/[0.05] bg-zinc-900 px-3 py-2"
              >
                <StatusPill status={event.status} />
                <span className="min-w-0 truncate font-mono text-[12px] text-zinc-400">{event.text}</span>
              </m.li>
            ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

/* ───────── 3. Contacts: a segment that recalculates ───────── */

const SEGMENTS = [
  { rule: ["tag = clients-2026", "score ≥ 40"], count: 2318 },
  { rule: ["tag = clients-2026", "abonné = oui"], count: 3904 },
  { rule: ["ville = Dakar", "score ≥ 40"], count: 612 },
];

export function ContactsMock() {
  const [i, setI] = useState(0);
  const { ref } = useTileLoop(2600, () => setI((v) => (v + 1) % SEGMENTS.length));
  const seg = SEGMENTS[i];

  return (
    <div ref={ref} className="flex h-full flex-col justify-center gap-4">
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[12px]">
        <Filter aria-hidden className="size-3.5 text-zinc-500" />
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={seg.rule[0]}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-md border border-white/[0.08] bg-zinc-900 px-2 py-1 text-zinc-200"
          >
            {seg.rule[0]}
          </m.span>
        </AnimatePresence>
        <span className="text-zinc-500">ET</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <m.span
            key={seg.rule[1]}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-orange-200"
          >
            {seg.rule[1]}
          </m.span>
        </AnimatePresence>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="relative inline-block min-w-[5ch] font-mono text-[28px] font-medium tabular-nums tracking-[-0.02em] text-zinc-50 md:text-[32px]">
          <AnimatePresence mode="popLayout" initial={false}>
            <m.span
              key={seg.count}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="inline-block"
            >
              {String(seg.count).replace(/\B(?=(\d{3})+(?!\d))/g, " ")}
            </m.span>
          </AnimatePresence>
        </span>
        <span className="text-sm text-zinc-500">contacts</span>
      </div>
    </div>
  );
}

/* ───────── 4. Automations: a small graph with a travelling dot ───────── */

export function AutomationMock() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.5 });
  const running = inView && !reduce;

  const node =
    "relative z-10 flex min-h-10 min-w-0 items-center gap-2 rounded-lg border border-white/[0.08] bg-zinc-900 px-2.5 py-2 text-[11px] leading-tight text-zinc-200 sm:text-[12px]";

  return (
    <div ref={ref} className="flex h-full flex-col justify-center gap-3 font-mono">
      <div className="relative grid grid-cols-3 items-center gap-3 sm:gap-6">
        <div aria-hidden className="absolute inset-x-6 top-1/2 h-px overflow-hidden bg-white/[0.1]">
          {running ? (
            <span className="mp-travel absolute inset-0 block">
              <span className="absolute right-0 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-orange-400 shadow-[0_0_10px_2px_rgba(249,115,22,0.6)]" />
            </span>
          ) : null}
        </div>
        <span className={node}>
          <UserPlus aria-hidden className="hidden size-3.5 shrink-0 text-orange-400 xl:block" /> Nouvel abonné
        </span>
        <span className={node}>
          <Timer aria-hidden className="hidden size-3.5 shrink-0 text-zinc-400 xl:block" /> Attendre 2 j
        </span>
        <span className={node}>
          <GitBranch aria-hidden className="hidden size-3.5 shrink-0 text-zinc-400 xl:block" /> Ouvert ?
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <div aria-hidden />
        <div className="relative col-span-2 grid grid-cols-2 gap-3 pt-5 sm:gap-6">
          <div aria-hidden className="absolute right-[25%] top-0 h-5 w-px bg-white/[0.1]" />
          <div aria-hidden className="absolute left-[25%] right-[25%] top-5 h-px bg-white/[0.1]" />
          <div aria-hidden className="absolute left-[25%] top-5 h-5 w-px bg-orange-500/40" />
          <div aria-hidden className="absolute right-[25%] top-5 h-5 w-px bg-white/[0.1]" />
          <span className={cn(node, "mt-5 border-orange-500/35")}>
            <Mail aria-hidden className="hidden size-3.5 shrink-0 text-orange-400 xl:block" /> Non → relance
          </span>
          <span className={cn(node, "mt-5")}>
            <Tag aria-hidden className="hidden size-3.5 shrink-0 text-zinc-400 xl:block" /> Oui → tag
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────── 5. Verification codes ───────── */

const CODE = ["4", "8", "2", "9", "1", "7"];

export function CodeMock() {
  const [seconds, setSeconds] = useState(592);
  const { ref, reduce } = useTileLoop(1000, () => setSeconds((s) => (s <= 1 ? 600 : s - 1)));
  // Digits reveal once and stay; only the countdown pauses off-screen.
  const seen = useInView(ref, { amount: 0.5, once: true });
  const show = seen || reduce;
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div ref={ref} className="flex h-full flex-col items-center justify-center gap-4">
      <div className="flex items-center gap-1.5 sm:gap-2" aria-label="Code à six chiffres, exemple">
        {CODE.map((digit, i) => (
          <span key={i} className="contents">
            {i === 3 ? <span aria-hidden className="w-1 text-center text-zinc-600">·</span> : null}
            <span className="flex h-12 w-9 items-center justify-center rounded-md border border-white/[0.08] bg-zinc-900 font-mono text-xl text-zinc-50 sm:w-10">
              <m.span
                initial={{ opacity: 0, y: 6 }}
                animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                transition={{ duration: 0.25, delay: reduce ? 0 : 0.15 + i * 0.06, ease: EASE }}
              >
                {digit}
              </m.span>
            </span>
          </span>
        ))}
      </div>
      <p className="font-mono text-[12px] text-zinc-500">
        WhatsApp · expire dans <span className="tabular-nums text-orange-300">{mm}:{ss}</span> · 5 essais
      </p>
    </div>
  );
}

