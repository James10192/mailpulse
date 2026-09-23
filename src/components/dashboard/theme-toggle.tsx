"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  if (!mounted) return <div className="w-8 h-8" />;

  const options = [
    { value: "light", icon: Sun, label: "Clair" },
    { value: "dark", icon: Moon, label: "Sombre" },
    { value: "system", icon: Monitor, label: "Système" },
  ] as const;

  return (
    <ToggleGroup
      type="single"
      size="sm"
      value={theme ?? ""}
      // Radix emits "" when the active item is clicked again; keep the current theme in that case.
      onValueChange={(next) => {
        if (next) setTheme(next);
      }}
      aria-label="Thème"
      className="gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700/50 dark:bg-zinc-800/50"
    >
      {options.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          aria-label={opt.label}
          title={opt.label}
          className="size-7 min-w-7 rounded-md p-1.5 text-zinc-400 hover:bg-transparent hover:text-zinc-600 data-[state=on]:bg-white data-[state=on]:text-zinc-900 data-[state=on]:shadow-sm dark:hover:text-zinc-300 dark:data-[state=on]:bg-zinc-700 dark:data-[state=on]:text-zinc-100"
        >
          <opt.icon className="h-3.5 w-3.5" />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
