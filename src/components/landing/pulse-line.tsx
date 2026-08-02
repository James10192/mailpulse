"use client";

import { motion } from "motion/react";

export function PulseLine() {
  return (
    <div className="relative h-px w-full max-w-2xl mx-auto my-16 overflow-hidden">
      <div className="absolute inset-0 bg-zinc-200 dark:bg-zinc-800" />
      <motion.div
        className="absolute inset-y-0 w-16 bg-orange-500/65"
        style={{
          borderRadius: "999px",
        }}
        animate={{
          x: ["-128px", "calc(100% + 128px)"],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 1,
        }}
      />
    </div>
  );
}
