"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

import { isOneOf } from "@/components/forms/one-of";
import { SingleChoiceGroup } from "@/components/forms/single-choice-group";
import { ToggleGroupItem } from "@/components/ui/toggle-group";

const OPTIONS = [
  { value: "light", icon: Sun, label: "Clair" },
  { value: "dark", icon: Moon, label: "Sombre" },
  { value: "system", icon: Monitor, label: "Système" },
] as const;

const THEMES = OPTIONS.map((option) => option.value);

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <SingleChoiceGroup
      values={THEMES}
      // Rendered disabled until mounted (the theme is only known client-side), so the
      // placeholder has exactly the size of the final control.
      value={mounted && theme && isOneOf(THEMES, theme) ? theme : ""}
      disabled={!mounted}
      onValueChange={setTheme}
      aria-label="Thème"
      className="gap-0.5 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700/50 dark:bg-zinc-800/50"
    >
      {OPTIONS.map((opt) => (
        <ToggleGroupItem
          key={opt.value}
          value={opt.value}
          aria-label={opt.label}
          title={opt.label}
          variant="segment"
          size="icon-xs"
        >
          <opt.icon className="h-3.5 w-3.5" />
        </ToggleGroupItem>
      ))}
    </SingleChoiceGroup>
  );
}
