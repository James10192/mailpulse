"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type PlatformTab = "messages" | "verifications" | "integrations";

/**
 * The active tab lives in the URL (`?tab=`), so « Voir ses messages » on a key
 * lands on the messages tab and a reload or a shared link keeps the tab.
 */
export function PlatformTabs({
  tab,
  messages,
  verifications,
  integrations,
}: {
  tab: PlatformTab;
  messages: ReactNode;
  verifications: ReactNode;
  integrations: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={tab} onValueChange={select} className="space-y-4">
      <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900 sm:w-auto">
        <TabsTrigger value="messages" className="min-h-10 px-4">Messages</TabsTrigger>
        <TabsTrigger value="verifications" className="min-h-10 px-4">Vérifications</TabsTrigger>
        <TabsTrigger value="integrations" className="min-h-10 px-4">Clés API et intégrations</TabsTrigger>
      </TabsList>
      <TabsContent value="messages" className="space-y-6">{messages}</TabsContent>
      <TabsContent value="verifications" className="space-y-6">{verifications}</TabsContent>
      <TabsContent value="integrations" className="space-y-6">{integrations}</TabsContent>
    </Tabs>
  );
}
