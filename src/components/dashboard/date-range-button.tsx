"use client";

import { Calendar } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

export function DateRangeButton() {
  const end = new Date();
  const start = subDays(end, 30);

  return (
    <button className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer font-mono text-xs">
      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
      {format(start, "MMM d, yyyy", { locale: fr })} – {format(end, "MMM d, yyyy", { locale: fr })}
    </button>
  );
}
