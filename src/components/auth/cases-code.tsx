"use client";

import { forwardRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

export const LONGUEUR_CODE = 6;

/** Keep digits only: « 482 917 », « 482-917 » and a pasted sentence all work. */
export function nettoyerCode(brut: string): string {
  return brut.replace(/\D/g, "").slice(0, LONGUEUR_CODE);
}

type Etat = "normal" | "verification" | "erreur" | "succes";

/**
 * Six visual boxes over ONE real input: paste, autofill (`one-time-code`),
 * screen readers and the mobile numeric keyboard all see a single field.
 */
export const CasesCode = forwardRef<
  HTMLInputElement,
  {
    valeur: string;
    onChange: (valeur: string) => void;
    etat?: Etat;
    secousse?: number;
    desactive?: boolean;
    idDescription?: string;
  }
>(function CasesCode({ valeur, onChange, etat = "normal", secousse = 0, desactive, idDescription }, ref) {
  const [focus, setFocus] = useState(false);
  const reduit = useReducedMotion();
  const chiffres = valeur.split("");
  const active = Math.min(valeur.length, LONGUEUR_CODE - 1);

  return (
    <motion.div
      key={secousse}
      className="relative"
      animate={secousse > 0 && !reduit ? { x: [0, -6, 6, -4, 4, 0] } : undefined}
      transition={{ duration: 0.32 }}
    >
      <input
        ref={ref}
        value={valeur}
        onChange={(e) => onChange(nettoyerCode(e.target.value))}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={LONGUEUR_CODE + 4}
        disabled={desactive}
        aria-label="Code à 6 chiffres"
        aria-describedby={idDescription}
        aria-invalid={etat === "erreur"}
        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
      />
      <div className={cn("grid grid-cols-6 gap-2 transition-opacity", etat === "verification" && "opacity-60")} aria-hidden="true">
        {Array.from({ length: LONGUEUR_CODE }, (_, i) => {
          const courante = focus && i === active && etat !== "verification";

          return (
            <div
              key={i}
              className={cn(
                "flex h-[52px] items-center justify-center rounded-[10px] border bg-zinc-900 font-mono text-2xl text-zinc-50 tabular-nums transition-colors duration-200 sm:h-14",
                "border-white/[0.08]",
                courante && "border-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.18)]",
                etat === "erreur" && "border-red-400/80",
                etat === "succes" && "border-emerald-400",
              )}
            >
              {chiffres[i] ?? (courante ? <span className="h-6 w-px animate-pulse bg-orange-400" /> : null)}
            </div>
          );
        })}
      </div>
      {etat === "verification" && !reduit && (
        <div className="pointer-events-none absolute inset-x-0 -bottom-2 h-px overflow-hidden" aria-hidden="true">
          <motion.div
            className="h-px w-1/3 bg-gradient-to-r from-transparent via-orange-500 to-transparent"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}
    </motion.div>
  );
});
