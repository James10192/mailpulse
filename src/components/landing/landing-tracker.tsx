"use client";

import { useEffect, useRef } from "react";
import { usePostHog } from "posthog-js/react";
import { EVENTS } from "@/lib/analytics-events";

export function LandingCTATracker({
  children,
  location,
}: {
  children: React.ReactNode;
  location: string;
}) {
  const posthog = usePostHog();

  return (
    <span
      onClick={() => {
        posthog?.capture(EVENTS.LANDING_CTA_CLICKED, { cta_location: location });
      }}
    >
      {children}
    </span>
  );
}

export function PricingSectionTracker() {
  const posthog = usePostHog();
  const tracked = useRef(false);

  useEffect(() => {
    const el = document.getElementById("pricing");
    if (!el || !posthog) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tracked.current) {
          tracked.current = true;
          posthog.capture(EVENTS.LANDING_PRICING_VIEWED);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [posthog]);

  return null;
}
