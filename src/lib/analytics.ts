import { posthogServer } from "./posthog-server";

// Re-export EVENTS for server-side convenience
export { EVENTS } from "./analytics-events";

// ---------------------------------------------------------------------------
// Server-side tracking helper
// ---------------------------------------------------------------------------

export function trackServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>,
  organizationId?: string
) {
  if (!process.env.POSTHOG_API_KEY) return;

  posthogServer.capture({
    distinctId: userId,
    event,
    properties: {
      ...properties,
      $lib: "posthog-node",
    },
    ...(organizationId ? { groups: { organization: organizationId } } : {}),
  });
}

// ---------------------------------------------------------------------------
// Server-side identify helpers
// ---------------------------------------------------------------------------

export function identifyUser(
  userId: string,
  properties: Record<string, unknown>
) {
  if (!process.env.POSTHOG_API_KEY) return;

  posthogServer.identify({
    distinctId: userId,
    properties,
  });
}

export function identifyOrganization(
  organizationId: string,
  properties: Record<string, unknown>
) {
  if (!process.env.POSTHOG_API_KEY) return;

  posthogServer.groupIdentify({
    groupType: "organization",
    groupKey: organizationId,
    properties,
  });
}
