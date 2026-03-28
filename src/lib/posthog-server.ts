import { PostHog } from "posthog-node";

const globalForPostHog = globalThis as unknown as { posthogServer?: PostHog };

export const posthogServer =
  globalForPostHog.posthogServer ??
  new PostHog(process.env.POSTHOG_API_KEY ?? "", {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPostHog.posthogServer = posthogServer;
}
