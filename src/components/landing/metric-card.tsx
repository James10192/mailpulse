"use client";

import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect } from "react";

interface MetricCardProps {
  value: number;
  suffix: string;
  label: string;
  delay?: number;
}

function AnimatedNumber({ value, delay = 0 }: { value: number; delay?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v).toString()
  );

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 2,
      delay,
      ease: [0.21, 0.47, 0.32, 0.98],
    });
    return controls.stop;
  }, [count, value, delay]);

  return <motion.span>{rounded}</motion.span>;
}

export function MetricCard({ value, suffix, label, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="text-4xl md:text-5xl font-bold tracking-tight font-mono">
        <AnimatedNumber value={value} delay={delay + 0.3} />
        <span className="text-orange-500">{suffix}</span>
      </div>
      <div className="mt-2 text-sm text-zinc-500 uppercase tracking-widest">
        {label}
      </div>
    </motion.div>
  );
}
