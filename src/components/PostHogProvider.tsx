"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, Suspense } from "react";
import { useSession, useActiveOrganization } from "@/lib/auth-client";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (pathname && ph) {
      let url = window.origin + pathname;
      const search = searchParams.toString();
      if (search) url += `?${search}`;
      ph.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, ph]);

  return null;
}

function PostHogIdentify() {
  const ph = usePostHog();
  const { data: session } = useSession();
  const { data: activeOrg } = useActiveOrganization();
  const identifiedRef = useRef<string | null>(null);
  const groupRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ph || !session?.user) return;

    const userId = session.user.id;
    if (identifiedRef.current === userId) return;

    ph.identify(userId, {
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      created_at: session.user.createdAt,
    });
    identifiedRef.current = userId;
  }, [ph, session]);

  useEffect(() => {
    if (!ph || !activeOrg) return;

    const orgId = activeOrg.id;
    if (groupRef.current === orgId) return;

    ph.group("organization", orgId, {
      name: activeOrg.name,
      slug: activeOrg.slug,
    });
    groupRef.current = orgId;
  }, [ph, activeOrg]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

    if (!key) {
      console.warn("[PostHog] NEXT_PUBLIC_POSTHOG_KEY manquant — analytics desactives. Ajoutez-le dans .env.local ou Vercel.");
      return;
    }
    if (!host) {
      console.warn("[PostHog] NEXT_PUBLIC_POSTHOG_HOST manquant — utilisation du host par defaut.");
    }

    posthog.init(key, {
      api_host: host || "https://us.i.posthog.com",
      capture_pageview: false,
      capture_pageleave: true,
      loaded: () => {
        console.info(`[PostHog] Initialise (token: ${key.slice(0, 8)}..., host: ${host || "us.i.posthog.com"})`);
      },
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PHProvider>
  );
}
