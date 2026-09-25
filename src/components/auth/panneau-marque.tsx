"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const CODE = "482917";

/**
 * The brand panel replays the visitor's own journey: an email arrives, its
 * code reveals digit by digit, then « Livré », then « Ouvert ». A loop of
 * seven seconds; frozen on its final frame when motion is reduced.
 */
export function PanneauMarque() {
  const reduit = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  const [etape, setEtape] = useState(reduit ? 3 : 0);

  useEffect(() => {
    if (reduit) return;
    const minuteurs = [
      window.setTimeout(() => setEtape(1), 500),
      window.setTimeout(() => setEtape(2), 1800),
      window.setTimeout(() => setEtape(3), 2900),
      window.setTimeout(() => {
        setEtape(0);
        setCycle((c) => c + 1);
      }, 7000),
    ];

    return () => minuteurs.forEach((m) => window.clearTimeout(m));
  }, [cycle, reduit]);

  return (
    <div className="relative w-full max-w-[400px]">
      <div className="absolute -inset-10 -z-10 rounded-full bg-orange-500/[0.07] blur-3xl" aria-hidden="true" />
      <div className="rounded-[20px] border border-white/[0.06] bg-zinc-950/80 p-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_24px_64px_-24px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-1.5 px-3 py-2" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <span className="ml-3 font-mono text-[11px] text-zinc-500">boîte de réception</span>
        </div>
        <div className="min-h-[196px] rounded-[14px] border border-white/[0.06] bg-zinc-900 p-5">
          <AnimatePresence mode="wait">
            {etape >= 1 && (
              <motion.div
                key={cycle}
                initial={reduit ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.3 } }}
                transition={{ type: "spring", duration: 0.5, bounce: 0 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/15 font-mono text-xs font-medium text-orange-400">MP</span>
                    <div>
                      <p className="text-sm font-medium text-zinc-100">MailPulse</p>
                      <p className="font-mono text-[11px] text-zinc-500">à l&apos;instant</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Pastille visible={etape >= 2} ton="livre">Livré · 0,8 s</Pastille>
                    <Pastille visible={etape >= 3} ton="ouvert">Ouvert</Pastille>
                  </div>
                </div>
                <p className="mt-4 text-sm text-zinc-300">{CODE} est votre code MailPulse</p>
                <div className="mt-3 flex gap-1.5 font-mono text-xl text-zinc-50" aria-label={`Code ${CODE}`}>
                  {CODE.split("").map((chiffre, i) => (
                    <motion.span
                      key={i}
                      className="flex h-10 w-9 items-center justify-center rounded-md border border-white/[0.06] bg-zinc-950"
                      initial={reduit ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: reduit ? 0 : 0.3 + i * 0.06 }}
                    >
                      {chiffre}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Pastille({ visible, ton, children }: { visible: boolean; ton: "livre" | "ouvert"; children: React.ReactNode }) {
  return (
    <motion.span
      initial={false}
      animate={{ opacity: visible ? 1 : 0, scale: visible ? 1 : 0.9 }}
      transition={{ duration: 0.2 }}
      className={
        ton === "livre"
          ? "rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300"
          : "rounded-full border border-orange-400/25 bg-orange-500/10 px-2 py-0.5 font-mono text-[10px] text-orange-300"
      }
    >
      {children}
    </motion.span>
  );
}
