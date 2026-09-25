"use client";

import { useRef, useState, useEffect } from "react";
import { AnimatePresence, m, useInView, useScroll } from "motion/react";
import { Check, FileSpreadsheet, GitBranch, Mail, MessageCircle, MessageSquareText, Tag, Timer } from "lucide-react";

import { cn } from "@/lib/utils";
import { EASE } from "./reveal";
import { StatusPill, WindowFrame } from "./primitives";

/* ───────── Mockups for each step (static, server-safe markup) ───────── */

function ImportPanel() {
  const rows = [
    ["awa@exemple.com", "Awa", "+225 07 00 00 00 12"],
    ["k.traore@exemple.com", "Karim", "+225 05 00 00 00 88"],
    ["m.diallo@exemple.com", "Mariam", "+221 77 000 00 03"],
  ];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-mono text-[12px] text-zinc-400">
        <FileSpreadsheet aria-hidden className="size-4 text-orange-400" />
        contacts-mars.csv · 1 204 lignes
      </div>
      <div className="overflow-hidden rounded-lg border border-white/[0.06]">
        <div className="grid grid-cols-[1.4fr_0.8fr_1.3fr] gap-3 border-b border-white/[0.06] bg-zinc-950/40 px-3 py-2 font-mono text-[11px] text-zinc-500">
          <span>email ✓</span>
          <span>prénom ✓</span>
          <span>téléphone ✓</span>
        </div>
        {rows.map((r) => (
          <div
            key={r[0]}
            className="grid grid-cols-[1.4fr_0.8fr_1.3fr] gap-3 border-b border-white/[0.04] px-3 py-2.5 font-mono text-[11px] text-zinc-300 last:border-0"
          >
            <span className="truncate">{r[0]}</span>
            <span className="truncate">{r[1]}</span>
            <span className="truncate">{r[2]}</span>
          </div>
        ))}
      </div>
      <ul className="space-y-1.5 font-mono text-[12px] text-zinc-400">
        <li className="flex items-center gap-2">
          <Check aria-hidden className="size-3.5 text-emerald-400" /> Numéros convertis au format international
        </li>
        <li className="flex items-center gap-2">
          <Check aria-hidden className="size-3.5 text-emerald-400" /> 3 adresses déjà présentes, ignorées
        </li>
        <li className="flex items-center gap-2">
          <Check aria-hidden className="size-3.5 text-emerald-400" /> Limite du plan vérifiée avant l&apos;import
        </li>
      </ul>
    </div>
  );
}

function ComposePanel() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "E-mail", Icon: Mail, on: true },
          { label: "WhatsApp", Icon: MessageCircle, on: false },
          { label: "SMS", Icon: MessageSquareText, on: false },
        ].map((c) => (
          <div
            key={c.label}
            className={cn(
              "flex min-h-11 items-center justify-center gap-2 rounded-lg border text-xs font-medium",
              c.on ? "border-orange-500/40 bg-orange-500/10 text-orange-200" : "border-white/[0.06] text-zinc-400",
            )}
          >
            <c.Icon aria-hidden className="size-3.5" /> {c.label}
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-zinc-950/40 p-4 font-mono text-[12px] leading-relaxed text-zinc-300">
        <p className="text-zinc-500">Objet</p>
        <p className="mt-1 text-zinc-100">Votre rendez-vous du {"{{date}}"}</p>
        <div className="my-3 h-px bg-white/[0.06]" />
        <p>
          Bonjour <span className="text-orange-300">{"{{prenom}}"}</span>, nous vous attendons le{" "}
          <span className="text-orange-300">{"{{date}}"}</span>.
        </p>
      </div>
      <p className="font-mono text-[12px] text-zinc-500">Destinataires : segment « Clients actifs » · 2 318</p>
    </div>
  );
}

function TimelinePanel() {
  const events = [
    { t: "14:02:08", status: "queued" as const, text: "mis en file" },
    { t: "14:02:09", status: "sent" as const, text: "accepté par le fournisseur" },
    { t: "14:02:11", status: "delivered" as const, text: "remis à la boîte" },
    { t: "14:06:47", status: "opened" as const, text: "ouvert · mobile" },
    { t: "14:07:02", status: "clicked" as const, text: "lien « Confirmer »" },
  ];
  return (
    <div>
      <p className="font-mono text-[12px] text-zinc-400">awa@exemple.com · message msg_01J8…</p>
      <ol className="relative mt-4 space-y-3 before:absolute before:bottom-3 before:left-[5px] before:top-3 before:w-px before:bg-white/[0.08]">
        {events.map((e) => (
          <li key={e.t} className="relative flex items-center gap-3 pl-6">
            <span aria-hidden className="absolute left-0 size-[11px] rounded-full border-2 border-zinc-900 bg-zinc-600" />
            <span className="w-16 shrink-0 font-mono text-[11px] text-zinc-500">{e.t}</span>
            <StatusPill status={e.status} />
            <span className="min-w-0 truncate text-[13px] text-zinc-400">{e.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function FlowPanel() {
  const row = "grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border border-white/[0.08] px-3 py-2.5 font-mono text-[12px]";
  const RETOURS = [
    { evt: "Rebond définitif", effet: "contact désabonné", Icon: Mail },
    { evt: "Plainte pour spam", effet: "contact exclu", Icon: Mail },
    { evt: "Lien de désabonnement", effet: "désabonné en 1 clic", Icon: Tag },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      {RETOURS.map(({ evt, effet, Icon }) => (
        <div key={evt} className={row}>
          <span className="flex min-w-0 items-center gap-2 text-zinc-200">
            <Icon aria-hidden className="size-3.5 shrink-0 text-zinc-400" />
            <span className="truncate">{evt}</span>
          </span>
          <GitBranch aria-hidden className="size-3.5 text-zinc-600" />
          <span className="truncate text-right text-orange-300">{effet}</span>
        </div>
      ))}
      <div className={cn(row, "border-orange-500/35 bg-orange-500/[0.06]")}>
        <span className="flex min-w-0 items-center gap-2 text-zinc-200">
          <Timer aria-hidden className="size-3.5 shrink-0 text-zinc-400" />
          <span className="truncate">message.delivered</span>
        </span>
        <GitBranch aria-hidden className="size-3.5 text-zinc-600" />
        <span className="truncate text-right text-orange-200">webhook signé</span>
      </div>
      <p className="mt-2 text-center font-mono text-[11px] text-zinc-400">Aucune action manuelle.</p>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Importez vos contacts",
    text: "Un fichier CSV ou l'API. Les numéros sont convertis au format international, les adresses déjà connues ne sont pas dupliquées.",
    window: "Contacts / Import",
    Panel: ImportPanel,
  },
  {
    n: "02",
    title: "Composez une fois",
    text: "Un message, des variables, un segment. Choisissez l'e-mail ou WhatsApp pour la campagne, le SMS sur demande.",
    window: "Campagnes / Nouvelle campagne",
    Panel: ComposePanel,
  },
  {
    n: "03",
    title: "Envoyez et suivez",
    text: "Chaque message a son journal : mis en file, envoyé, livré, ouvert, cliqué ou en échec, avec l'heure exacte.",
    window: "Messages / Journal",
    Panel: TimelinePanel,
  },
  {
    n: "04",
    title: "Laissez les retours travailler",
    text: "Un rebond définitif, une plainte ou un désabonnement met le contact à jour tout seul, et un webhook signé prévient votre application.",
    window: "Contacts / Mises à jour",
    Panel: FlowPanel,
  },
];

function StepText({
  step,
  index,
  active,
  onActive,
}: {
  step: (typeof STEPS)[number];
  index: number;
  active: boolean;
  onActive: (index: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.6 });

  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  const { Panel } = step;

  return (
    <div ref={ref} className="min-w-0 lg:flex lg:min-h-[55vh] lg:items-center">
      <div className="max-w-[460px]">
        <span
          className={cn(
            "font-mono text-sm transition-colors duration-200",
            active ? "text-orange-400" : "text-zinc-500",
          )}
        >
          {step.n}
        </span>
        <h3 className="mt-3 text-2xl font-semibold tracking-[-0.025em] text-zinc-50 md:text-[28px]">{step.title}</h3>
        <p className="mt-3 text-pretty text-[15px] leading-[1.6] text-zinc-400 md:text-base">{step.text}</p>
      </div>
      {/* Mobile and tablet: each step carries its own mockup, no sticky. */}
      <div className="mt-6 lg:hidden">
        <WindowFrame title={step.window} bodyClassName="p-4 sm:p-5">
          <Panel />
        </WindowFrame>
      </div>
    </div>
  );
}

export function Story() {
  const [active, setActive] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: railRef, offset: ["start center", "end center"] });
  const current = STEPS[active];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-2 lg:gap-16">
      <div ref={railRef} className="relative min-w-0 pl-6 md:pl-8">
        <div aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-zinc-800">
          <m.div className="absolute inset-0 origin-top bg-orange-500" style={{ scaleY: scrollYProgress }} />
        </div>
        <div className="space-y-16 lg:space-y-0">
          {STEPS.map((step, i) => (
            <StepText key={step.n} step={step} index={i} active={active === i} onActive={setActive} />
          ))}
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="sticky top-24">
          <WindowFrame title={current.window} bodyClassName="relative min-h-[380px] p-6">
            <AnimatePresence mode="popLayout" initial={false}>
              <m.div
                key={current.n}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <current.Panel />
              </m.div>
            </AnimatePresence>
          </WindowFrame>
          <div className="mt-4 flex justify-center gap-2" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.n}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  i === active ? "w-6 bg-orange-500" : "w-1.5 bg-zinc-700",
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
