"use client";

import { motion } from "motion/react";

export function HeroGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-x-0 top-0 h-px bg-orange-500"
        animate={{
          opacity: [0.68, 1, 0.68],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <div className="absolute inset-x-8 top-5 h-px bg-orange-200 dark:bg-orange-500/30" />
    </div>
  );
}
