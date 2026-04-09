"use client";

import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useSidebar } from "@/components/dashboard/sidebar-context";

export function SidebarToggle() {
  const { collapsed, toggle } = useSidebar();

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all w-full cursor-pointer"
      title={collapsed ? "Ouvrir" : "Reduire"}
    >
      {collapsed ? (
        <ChevronsRight className="h-4 w-4 mx-auto" />
      ) : (
        <>
          <ChevronsLeft className="h-4 w-4" />
          <span>Reduire</span>
        </>
      )}
    </button>
  );
}
