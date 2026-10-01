"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSession } from "@/lib/auth-client";

type CachedToken = { userId: string; token: string; expiresAt: number };

/** Ask for a fresh token this long before the cached one expires. */
const RENEW_BEFORE_MS = 60_000;

/**
 * Convex auth for ConvexProviderWithAuth: the token comes from
 * /api/convex/token, signed by MailPulse for the signed-in member. Without a
 * session, Convex runs unauthenticated and the live widgets stay empty.
 */
export function useMailPulseConvexAuth() {
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id ?? null;
  const cache = useRef<CachedToken | null>(null);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!userId) return null;
      const cached = cache.current;
      if (!forceRefreshToken && cached?.userId === userId && cached.expiresAt - RENEW_BEFORE_MS > Date.now()) {
        return cached.token;
      }
      try {
        const response = await fetch("/api/convex/token", { cache: "no-store", redirect: "manual" });
        if (!response.ok) return null;
        const body = (await response.json()) as { token?: unknown; expiresAt?: unknown };
        if (typeof body.token !== "string" || typeof body.expiresAt !== "number") return null;
        cache.current = { userId, token: body.token, expiresAt: body.expiresAt };
        return body.token;
      } catch {
        return null;
      }
    },
    [userId],
  );

  return useMemo(
    () => ({ isLoading: isPending, isAuthenticated: userId !== null, fetchAccessToken }),
    [isPending, userId, fetchAccessToken],
  );
}
