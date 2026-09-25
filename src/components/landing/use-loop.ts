"use client";

import { useEffect, useRef } from "react";

/**
 * Runs `tick` every `ms` while `active` is true. Callers pass
 * `inView && !reducedMotion`, so loops pause off-screen and never run
 * for visitors who prefer reduced motion.
 */
export function useLoop(active: boolean, ms: number, tick: () => void) {
  const saved = useRef(tick);
  useEffect(() => {
    saved.current = tick;
  });
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => saved.current(), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
}
