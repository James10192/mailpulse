"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";

/**
 * Landing-wide motion setup. LazyMotion + domAnimation keeps the animation
 * bundle small (no layout/drag features); reducedMotion="user" drops
 * transforms for visitors who asked the OS for less motion.
 */
export function LandingMotion({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
