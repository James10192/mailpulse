"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  m,
  useAnimate,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Mail, MessageCircle, MessageSquareText } from "lucide-react";

import { EASE } from "./reveal";
import { StatusPill, WindowFrame, type Status } from "./primitives";
import { useLoop } from "./use-loop";

type Channel = "email" | "whatsapp" | "sms";

type Entry = { to: string; channel: Channel; final: Status };

// Illustrative, masked recipients. No real address or number.
const POOL: Entry[] = [
  { to: "a•••@gmail.com", channel: "email", final: "opened" },
  { to: "+225 07 •• •• 12", channel: "whatsapp", final: "read" },
  { to: "+225 05 •• •• 88", channel: "sms", final: "delivered" },
  { to: "k•••@yahoo.fr", channel: "email", final: "clicked" },
  { to: "+225 01 •• •• 40", channel: "whatsapp", final: "read" },
  { to: "m•••@outlook.com", channel: "email", final: "delivered" },
  { to: "+221 77 •• •• 03", channel: "whatsapp", final: "delivered" },
  { to: "s•••@entreprise.ci", channel: "email", final: "opened" },
  { to: "+225 07 •• •• 65", channel: "sms", final: "delivered" },
  { to: "d•••@gmail.com", channel: "email", final: "opened" },
  { to: "+229 97 •• •• 21", channel: "whatsapp", final: "read" },
  { to: "f•••@proton.me", channel: "email", final: "clicked" },
  { to: "+225 05 •• •• 07", channel: "sms", final: "delivered" },
  { to: "y•••@gmail.com", channel: "email", final: "delivered" },
  { to: "+225 01 •• •• 93", channel: "whatsapp", final: "read" },
  { to: "b•••@orange.ci", channel: "email", final: "opened" },
  { to: "+226 70 •• •• 58", channel: "sms", final: "delivered" },
  { to: "n•••@gmail.com", channel: "email", final: "opened" },
  { to: "+225 07 •• •• 31", channel: "whatsapp", final: "delivered" },
  { to: "o•••@icloud.com", channel: "email", final: "failed" },
];

const VISIBLE = 7; // 6 rows shown + 1 sliding out under the mask
const ROW = 44;

type Row = { id: number; entry: Entry; age: number };

function statusFor(row: Row): Status {
  if (row.age === 0) return "sent";
  if (row.entry.final === "failed") return "failed";
  if (row.age === 1) return "delivered";
  return row.entry.final;
}

const channelMeta: Record<Channel, { label: string; Icon: typeof Mail }> = {
  email: { label: "E-mail", Icon: Mail },
  whatsapp: { label: "WhatsApp", Icon: MessageCircle },
  sms: { label: "SMS", Icon: MessageSquareText },
};

function groupDigits(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function initialRows(): Row[] {
  return Array.from({ length: VISIBLE }, (_, i) => ({ id: i, entry: POOL[i], age: i + 2 }));
}

// 24 hourly points, rising through the working day. Illustrative shape only.
const SERIES = [8, 6, 5, 5, 6, 9, 16, 28, 44, 58, 63, 60, 52, 49, 55, 62, 66, 61, 50, 39, 30, 22, 16, 12];

function sparkPaths(w: number, h: number) {
  const max = Math.max(...SERIES);
  const pts = SERIES.map((v, i) => [(i / (SERIES.length - 1)) * w, h - (v / max) * (h - 12) - 4] as const);
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return { line: d, area: `${d} L ${w} ${h} L 0 ${h} Z` };
}

const SPARK = sparkPaths(560, 150);

export function HeroConsole() {
  const reduce = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef, { amount: 0.2 });
  const [listScope, animateList] = useAnimate<HTMLUListElement>();

  const [rows, setRows] = useState<Row[]>(initialRows);
  const [next, setNext] = useState(VISIBLE);
  const [kpi, setKpi] = useState({ sent: 12480, opened: 5142, clicks: 3106 });
  const [desktop, setDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useLoop(inView && !reduce, 2400, () => {
    const entry = POOL[next % POOL.length];
    const aged = rows.map((row) => ({ ...row, age: row.age + 1 }));
    const becameEngaged = aged.filter((row) => row.age === 2 && ["opened", "read", "clicked"].includes(row.entry.final));
    const clicked = aged.filter((row) => row.age === 2 && row.entry.final === "clicked").length;
    setRows([{ id: next, entry, age: 0 }, ...aged].slice(0, VISIBLE));
    setNext((n) => n + 1);
    setKpi((k) => ({
      sent: k.sent + 1 + (next % 3),
      opened: k.opened + becameEngaged.length,
      clicks: k.clicks + clicked,
    }));
    if (listScope.current) {
      animateList(listScope.current, { y: [-ROW, 0] }, { duration: 0.3, ease: EASE });
    }
  });

  const { scrollYProgress } = useScroll({ target: frameRef, offset: ["start end", "start center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [8, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.96, 1]);
  const tilt = desktop && !reduce;

  const rate = ((kpi.opened / kpi.sent) * 100).toFixed(1).replace(".", ",");

  return (
    <div style={{ perspective: 1400 }}>
      <m.div
        ref={frameRef}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
        style={tilt ? { rotateX, scale, transformOrigin: "50% 0%" } : undefined}
      >
        <WindowFrame
          title="app.mailpulse / Campagnes / « Rappel rendez-vous »"
          right={
            <span className="hidden items-center gap-1.5 font-mono text-[11px] text-zinc-500 sm:inline-flex">
              <span className="size-1.5 rounded-full bg-orange-500" /> Envoi en cours
            </span>
          }
          bodyClassName="grid gap-px bg-white/[0.06] md:grid-cols-12"
        >
          {/* KPIs + chart */}
          <div className="order-1 bg-zinc-900 p-4 md:order-2 md:col-span-7 md:p-6 lg:col-span-8">
            <dl className="grid grid-cols-3 gap-3 md:gap-6">
              {[
                { label: "Envoyés", value: groupDigits(kpi.sent) },
                { label: "Taux d'ouverture", value: `${rate} %` },
                { label: "Clics", value: groupDigits(kpi.clicks) },
              ].map((item) => (
                <div key={item.label} className="min-w-0">
                  <dt className="truncate text-[11px] text-zinc-500 md:text-xs">{item.label}</dt>
                  <dd className="mt-1.5 font-mono text-lg font-medium tabular-nums tracking-[-0.02em] text-zinc-50 sm:text-2xl lg:text-[28px]">
                    <AnimatePresence mode="popLayout" initial={false}>
                      <m.span
                        key={item.value}
                        className="inline-block"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.25, ease: EASE }}
                      >
                        {item.value}
                      </m.span>
                    </AnimatePresence>
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6 hidden md:block">
              <div className="flex items-center justify-between font-mono text-[11px] text-zinc-500">
                <span>Ouvertures · dernières 24 h</span>
                <span>00 h — 23 h</span>
              </div>
              <svg viewBox="0 0 560 150" className="mt-3 h-auto w-full" role="img" aria-label="Courbe des ouvertures sur 24 heures">
                <defs>
                  <linearGradient id="mp-spark-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((f) => (
                  <line key={f} x1="0" x2="560" y1={150 * f} y2={150 * f} stroke="rgba(255,255,255,0.05)" />
                ))}
                <m.path
                  d={SPARK.area}
                  fill="url(#mp-spark-fill)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.9 }}
                />
                <m.path
                  d={SPARK.line}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, delay: 0.35, ease: EASE }}
                />
              </svg>
            </div>
          </div>

          {/* Send queue */}
          <div className="order-2 bg-zinc-900 p-4 md:order-1 md:col-span-5 md:p-5 lg:col-span-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-300">File d&apos;envoi</p>
              <p className="font-mono text-[11px] text-zinc-500">canal · statut</p>
            </div>
            <div className="relative mt-3 h-[132px] overflow-hidden md:h-[264px]">
              <ul ref={listScope} aria-label="Derniers envois">
                {rows.map((row) => {
                  const status = statusFor(row);
                  const { Icon, label } = channelMeta[row.entry.channel];
                  return (
                    <li
                      key={row.id}
                      className="flex h-11 items-center gap-2.5 border-b border-white/[0.05] last:border-0"
                    >
                      <Icon aria-hidden className="size-3.5 shrink-0 text-zinc-500" />
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-zinc-300">{row.entry.to}</span>
                      <span className="hidden font-mono text-[11px] text-zinc-500 xl:inline">{label}</span>
                      <AnimatePresence mode="popLayout" initial={false}>
                        <m.span
                          key={status}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <StatusPill status={status} />
                        </m.span>
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
              <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-zinc-900 to-transparent" />
            </div>
          </div>
        </WindowFrame>
      </m.div>
      <p className="mt-3 text-center font-mono text-[11px] text-zinc-500">
        Aperçu de l&apos;interface · données d&apos;exemple
      </p>
    </div>
  );
}
