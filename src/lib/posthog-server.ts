import { PostHog } from "posthog-node";

const globalForPostHog = globalThis as unknown as { posthogServer?: PostHog };

function createPostHogServer() {
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return null;

  return new PostHog(apiKey, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
}

function getPostHogServer() {
  if (!globalForPostHog.posthogServer) {
    const client = createPostHogServer();
    if (!client) return null;
    globalForPostHog.posthogServer = client;
  }

  return globalForPostHog.posthogServer;
}

export const posthogServer = new Proxy({} as PostHog, {
  get(_target, property) {
    const client = getPostHogServer();
    if (!client) return () => undefined;
    return Reflect.get(client, property);
  },
});
