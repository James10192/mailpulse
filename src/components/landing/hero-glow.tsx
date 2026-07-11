"use client";

import { motion } from "motion/react";

export function HeroGlow() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(249,115,22,0.16),transparent)]"
        animate={{
          opacity: [0.68, 1, 0.68],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="absolute inset-x-8 top-0 h-px bg-orange-500/30" />
      <div className="absolute inset-x-0 top-0 h-32 bg-[linear-gradient(180deg,#09090b,transparent)]" />
    </div>
  );
}
