"use client";

import { Calendar } from "lucide-react";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";

import { Button } from "@/components/ui/button";

export function DateRangeButton() {
  const end = new Date();
  const start = subDays(end, 30);

  return (
    <Button type="button" variant="outline" size="sm" className="gap-2 px-3 font-mono text-xs">
      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
      {format(start, "MMM d, yyyy", { locale: fr })} – {format(end, "MMM d, yyyy", { locale: fr })}
    </Button>
  );
}
