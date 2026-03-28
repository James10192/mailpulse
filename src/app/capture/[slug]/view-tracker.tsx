"use client";

import { useEffect, useRef } from "react";
import { trackCapturePageView } from "./actions";

export function ViewTracker({ pageId }: { pageId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackCapturePageView(pageId);
  }, [pageId]);

  return null;
}
