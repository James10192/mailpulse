"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";

const INTERVAL_MS = 30_000;

/**
 * Keeps the figures current while the page is in front of someone: the
 * server re-renders the open tab every 30 seconds, through the same
 * authenticated path as a click, and nothing runs in a background tab.
 *
 * Not Convex on purpose: its queries take an organization id with no
 * session check, so anything they returned would bypass the masking rules.
 */
export function LiveRefresh() {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
      setUpdatedAt(new Date());
    };
    const timer = window.setInterval(tick, INTERVAL_MS);
    // Coming back to the tab refreshes at once instead of waiting a full cycle.
    const onVisible = () => { if (document.visibilityState === "visible") tick(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, router]);

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <Switch checked={enabled} onCheckedChange={setEnabled} aria-label="Actualisation automatique" />
      <span>
        Actualisation auto
        {enabled && updatedAt ? <span className="hidden sm:inline"> · {updatedAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span> : null}
      </span>
    </label>
  );
}
