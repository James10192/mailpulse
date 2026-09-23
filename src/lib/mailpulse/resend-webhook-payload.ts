import { z } from "zod";

/**
 * Resend email webhook payloads, validated at the boundary. Only the fields the
 * platform reads are declared; Resend may add others without breaking parsing.
 * Reference: https://resend.com/docs/webhooks/emails
 */
export const RESEND_EVENT_TYPES = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
  "email.suppressed",
  "email.failed",
] as const;

export type ResendEventType = (typeof RESEND_EVENT_TYPES)[number];

const tagsSchema = z.union([
  z.record(z.string(), z.string()),
  z.array(z.object({ name: z.string(), value: z.string() })),
]);

const baseData = {
  email_id: z.string().min(1),
  tags: tagsSchema.optional(),
};

function event<T extends ResendEventType, D extends z.ZodRawShape>(type: T, data: D) {
  return z.object({
    type: z.literal(type),
    created_at: z.string(),
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

export type ParsedResendPayload =
  | { kind: "event"; event: ResendWebhookEvent }
  | { kind: "unsupported"; type: string }
  | { kind: "invalid"; issues: string };

/** Event types the platform does not handle are acknowledged, not rejected. */
export function parseResendWebhookPayload(payload: unknown): ParsedResendPayload {
  const envelope = eventEnvelopeSchema.safeParse(payload);
  if (!envelope.success) return { kind: "invalid", issues: "type" };
  if (!isResendEventType(envelope.data.type)) return { kind: "unsupported", type: envelope.data.type };
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

/** An unreadable timestamp falls back to reception time: it only dates the event. */
export function resendEventTime(event: ResendWebhookEvent, receivedAt: Date) {
  const occurredAt = new Date(event.created_at);
  return Number.isNaN(occurredAt.getTime()) ? receivedAt : occurredAt;
}

function isResendEventType(type: string): type is ResendEventType {
  return (RESEND_EVENT_TYPES as readonly string[]).includes(type);
}

function cleanReason(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
