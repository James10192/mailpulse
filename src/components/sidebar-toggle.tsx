"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useSidebar } from "@/components/dashboard/sidebar-context";
import { Button } from "@/components/ui/button";

export function SidebarToggle() {
  const { collapsed, toggle } = useSidebar();

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggle}
      className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      title={collapsed ? "Ouvrir" : "Réduire"}
    >
      {collapsed ? (
        <ChevronsRight className="h-4 w-4 mx-auto" />
      ) : (
        <>
          <ChevronsLeft className="h-4 w-4" />
          <span>Réduire</span>
        </>
      )}
    </Button>
  );
}
