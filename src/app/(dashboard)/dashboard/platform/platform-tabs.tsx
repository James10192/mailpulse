"use client";

import { useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export type PlatformTab = "overview" | "messages" | "verifications" | "integrations";

const LABELS: Record<PlatformTab, string> = {
  overview: "Vue d'ensemble",
  messages: "Messages",
  verifications: "Vérifications",
  integrations: "Clés API et intégrations",
};

// Filters that belong to one tab only; the period is shared on purpose.
const TAB_SCOPED = ["message", "page", "outcome", "status", "query", "channel", "origin", "key", "application", "sender"];

/**
 * The active tab lives in the URL (`?tab=`), so a link opens the right tab and
 * a reload keeps it. Only the active tab is rendered: the server loads its
 * data when the tab changes, never the others'.
 */
export function PlatformTabs({ tab, children }: { tab: PlatformTab; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    for (const name of TAB_SCOPED) params.delete(name);
    params.set("tab", value);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <Tabs value={tab} onValueChange={select} className="space-y-4">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 sm:w-auto">
        {(Object.keys(LABELS) as PlatformTab[]).map((value) => (
          <TabsTrigger key={value} value={value} className="min-h-10 px-4">{LABELS[value]}</TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={tab} className={cn("space-y-6 transition-opacity", isPending && "opacity-60")} aria-busy={isPending}>
        {children}
      </TabsContent>
    </Tabs>
  );
}
