"use client";

import { m, useReducedMotion, type Variants } from "motion/react";

export const EASE = [0.22, 1, 0.36, 1] as const;

const VIEWPORT = { once: true, amount: 0.25, margin: "0px 0px -10% 0px" } as const;

type RevealProps = {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  as?: "div" | "section" | "li";
  className?: string;
};

/** Fades a block in once when it enters the viewport. Never use it on the hero h1 (LCP). */
export function Reveal({ children, delay = 0, y = 16, as = "div", className }: RevealProps) {
  const reduce = useReducedMotion();
  const M = m[as];
  return (
    <M
      className={className}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y, filter: "blur(4px)" }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={VIEWPORT}
      transition={{ duration: reduce ? 0.2 : 0.6, ease: EASE, delay }}
    >
      {children}
    </M>
  );
}

const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const staggerChild: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export function Stagger({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "ul" | "ol";
}) {
  const M = m[as];
  return (
    <M className={className} variants={staggerParent} initial="hidden" whileInView="show" viewport={VIEWPORT}>
      {children}
    </M>
  );
}

export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li";
}) {
  const M = m[as];
  return (
    <M className={className} variants={staggerChild}>
      {children}
    </M>
  );
}
