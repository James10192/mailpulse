"use client";

import { useRef, useState } from "react";
import { m, useInView, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";
import { LiveDot } from "./primitives";
import { useLoop } from "./use-loop";

// Illustrative 14-day series per channel (thousands of messages).
const DAYS = ["12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25"];
const BASE: [number, number, number][] = [
  [3.1, 1.4, 0.6], [3.4, 1.6, 0.5], [2.2, 1.1, 0.4], [1.4, 0.7, 0.3], [3.8, 1.9, 0.7], [4.1, 2.1, 0.6], [3.6, 1.8, 0.8],
  [3.9, 2.2, 0.7], [2.6, 1.3, 0.5], [1.6, 0.9, 0.3], [4.4, 2.4, 0.9], [4.6, 2.2, 0.8], [4.2, 2.5, 0.7], [2.9, 1.5, 0.5],
];
const MAX = 8.4;

const KPIS = [
  { label: "Livrés", value: "98,6 %", delta: "+0,4 pt" },
  { label: "Ouverts", value: "41,2 %", delta: "+2,1 pts" },
  { label: "Cliqués", value: "12,4 %", delta: "+0,8 pt" },
  { label: "Désabonnements", value: "0,3 %", delta: "−0,1 pt" },
];

const LEGEND = [
  { label: "E-mail", className: "bg-orange-500" },
  { label: "WhatsApp", className: "bg-orange-500/45" },
  { label: "SMS", className: "bg-zinc-500" },
];

export function LiveAnalytics() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { amount: 0.3 });
  const seen = useInView(ref, { amount: 0.3, once: true });
  const [today, setToday] = useState(BASE[BASE.length - 1]);
  const [hover, setHover] = useState<number | null>(null);

  // Today's bar keeps growing a little while you watch.
  useLoop(inView && !reduce, 3000, () => {
    setToday(([e, w, s]) => {
      const f = 1.01 + Math.random() * 0.02;
      const next: [number, number, number] = [e * f, w * f, s * f];
      return next[0] + next[1] + next[2] > MAX - 0.3 ? BASE[BASE.length - 1] : next;
    });
  });

  const series = [...BASE.slice(0, -1), today];

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-zinc-900/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3 md:px-6">
        <p className="text-sm font-medium text-zinc-200">Messages par canal · 14 jours</p>
        <div className="flex items-center gap-4">
          <ul className="hidden items-center gap-3 sm:flex">
            {LEGEND.map((l) => (
              <li key={l.label} className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
                <span aria-hidden className={cn("size-2 rounded-[2px]", l.className)} />
                {l.label}
              </li>
            ))}
          </ul>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] text-orange-300">
            <LiveDot /> En direct
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-12">
        <dl className="grid grid-cols-2 gap-px bg-white/[0.06] md:order-2 md:col-span-4 md:grid-cols-1">
          {KPIS.map((k) => (
            <div key={k.label} className="bg-zinc-900 p-4 md:px-6 md:py-5">
              <dt className="text-xs text-zinc-500">{k.label}</dt>
              <dd className="mt-2 font-mono text-[28px] font-medium leading-none tabular-nums tracking-[-0.02em] text-zinc-50 lg:text-[36px]">
                {k.value}
              </dd>
              <dd className="mt-2 font-mono text-[11px] text-zinc-400">
                <span className="text-orange-300">{k.delta}</span> vs 7 j
              </dd>
            </div>
          ))}
        </dl>

        <div className="relative flex flex-col border-t border-white/[0.06] p-4 md:order-1 md:col-span-8 md:border-r md:border-t-0 md:p-6">
          <div className="relative flex h-56 items-end gap-1.5 sm:gap-2 md:h-auto md:min-h-72 md:flex-1" role="img" aria-label="Histogramme empilé des messages envoyés par canal sur 14 jours">
            {[0.25, 0.5, 0.75].map((line) => (
              <span
                key={line}
                aria-hidden
                className="absolute inset-x-0 border-t border-dashed border-white/[0.05]"
                style={{ bottom: `${line * 100}%` }}
              />
            ))}
            {series.map(([e, w, s], i) => {
              const total = e + w + s;
              const isToday = i === series.length - 1;
              return (
                <div
                  key={DAYS[i]}
                  className="relative flex h-full flex-1 items-end"
                  onPointerEnter={() => setHover(i)}
                  onPointerLeave={() => setHover(null)}
                >
                  <m.div
                    className="flex w-full origin-bottom flex-col overflow-hidden rounded-t-[4px] transition-[height] duration-700 ease-out"
                    initial={{ scaleY: 0 }}
                    animate={seen ? { scaleY: 1 } : { scaleY: 0 }}
                    transition={{ duration: 0.6, delay: i * 0.025, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: `${(total / MAX) * 100}%` }}
                  >
                    <m.div
                      className="flex h-full w-full flex-col"
                      animate={{ opacity: hover === null || hover === i ? 1 : 0.45 }}
                      transition={{ duration: 0.15 }}
                    >
                      <span className="block w-full bg-zinc-500" style={{ flexGrow: s }} />
                      <span className="block w-full bg-orange-500/45" style={{ flexGrow: w }} />
                      <span className={cn("block w-full bg-orange-500", isToday && "bg-orange-400")} style={{ flexGrow: e }} />
                    </m.div>
                  </m.div>
                  {hover === i ? (
                    <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/[0.08] bg-zinc-950 px-2.5 py-1.5 font-mono text-[11px] text-zinc-300 shadow-xl">
                      {DAYS[i]} sept. · {Math.round(total * 1000).toLocaleString("fr-FR")} msg
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex gap-1.5 font-mono text-[10px] text-zinc-500 sm:gap-2">
            {DAYS.map((day, i) => (
              <span key={day} className={cn("flex-1 text-center", i % 2 === 1 && "max-sm:invisible")}>
                {day}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="border-t border-white/[0.06] px-4 py-2.5 font-mono text-[11px] text-zinc-500 md:px-6">
        Données d&apos;exemple. Dans votre espace, ces chiffres sont les vôtres.
      </p>
    </div>
  );
}
