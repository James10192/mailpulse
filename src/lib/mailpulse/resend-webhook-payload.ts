import { z } from "zod";

/**
 * Resend email webhook payloads, validated at the boundary. Only the fields the
 * platform reads are declared; Resend may add others without breaking parsing.
 * Reference: https://resend.com/docs/webhooks/emails
 */
const tagsSchema = z.union([
  z.record(z.string(), z.string()),
  z.array(z.object({ name: z.string(), value: z.string() })),
]);

const baseData = {
  email_id: z.string().min(1),
  tags: tagsSchema.optional(),
};

function event<T extends string, D extends z.ZodRawShape>(type: T, data: D) {
  return z.object({
    type: z.literal(type),
    // Resend sends ISO 8601 UTC timestamps such as 2026-11-22T23:41:12.126Z.
    created_at: z.iso.datetime({ offset: true }),
    data: z.object({ ...baseData, ...data }),
  });
}

const resendWebhookEventSchema = z.discriminatedUnion("type", [
  event("email.sent", {}),
  event("email.delivered", {}),
  // The documented payload carries no reason for a delay.
  event("email.delivery_delayed", {}),
  event("email.opened", {}),
  event("email.clicked", {}),
  event("email.bounced", { bounce: z.object({ message: z.string().optional() }).optional() }),
  event("email.complained", {}),
  event("email.suppressed", { suppressed: z.object({ message: z.string().optional() }).optional() }),
  event("email.failed", { failed: z.object({ reason: z.string().optional() }).optional() }),
]);

const eventEnvelopeSchema = z.object({ type: z.string() });

export type ResendWebhookEvent = z.infer<typeof resendWebhookEventSchema>;
export type ResendEventType = ResendWebhookEvent["type"];

const HANDLED_EVENT_TYPES: ReadonlySet<string> = new Set(
  resendWebhookEventSchema.options.map((option) => option.shape.type.value),
);
export type ParsedResendPayload =
  | { kind: "event"; event: ResendWebhookEvent }
  | { kind: "unsupported"; type: string }
  | { kind: "invalid"; issues: string };

/** Event types the platform does not handle are acknowledged, not rejected. */
export function parseResendWebhookPayload(payload: unknown): ParsedResendPayload {
  const envelope = eventEnvelopeSchema.safeParse(payload);
  if (!envelope.success) return { kind: "invalid", issues: "type" };
  if (!HANDLED_EVENT_TYPES.has(envelope.data.type)) return { kind: "unsupported", type: envelope.data.type };
  const result = resendWebhookEventSchema.safeParse(payload);
  if (!result.success) {
    return { kind: "invalid", issues: result.error.issues.map((issue) => issue.path.join(".")).join(", ") };
  }
  return { kind: "event", event: result.data };
}

/** The human-readable reason Resend gives for a failure, when it gives one. */
export function resendEventReason(event: ResendWebhookEvent): string | null {
  switch (event.type) {
    case "email.bounced":
      return cleanReason(event.data.bounce?.message);
    case "email.suppressed":
      return cleanReason(event.data.suppressed?.message);
    case "email.failed":
      return cleanReason(event.data.failed?.reason);
    default:
      return null;
  }
}

export function resendEventTag(event: ResendWebhookEvent, name: string): string | null {
  const tags = event.data.tags;
  if (!tags) return null;
  if (Array.isArray(tags)) return tags.find((tag) => tag.name === name)?.value ?? null;
  return Object.hasOwn(tags, name) ? tags[name] : null;
}

export function resendEventTime(event: ResendWebhookEvent) {
  return new Date(event.created_at);
}

function cleanReason(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
