import type { ResendWebhookEvent } from "./resend-webhook-payload";

/** A minimal provider-confirmed outcome for the institution that submitted it.
 * Never expose email_html, full message text or arbitrary message metadata.
 */
export type AnnouncementEmailMessage = {
  id: string;
  organizationId: string;
  origin: string | null;
  channel: string;
  recipientType: string;
  recipientValue: string;
  provider: string;
  providerMessageId: string | null;
  status: string;
  externalTenantId: string | null;
  metadata: unknown;
};

const PROVIDER_EVENTS = {
  "email.delivered": ["message.delivered", ["DELIVERED", "READ"]],
  "email.delivery_delayed": ["message.delivery_delayed", ["SENT"]],
  "email.bounced": ["message.bounced", ["FAILED"]],
  "email.failed": ["message.failed", ["FAILED"]],
  "email.complained": ["message.complained", ["FAILED"]],
  "email.suppressed": ["message.suppressed", ["FAILED"]],
} as const;

export function announcementProviderEvent(event: ResendWebhookEvent, message: AnnouncementEmailMessage | null) {
  if (!message || message.origin !== "API" || message.channel !== "EMAIL"
      || message.recipientType !== "EMAIL" || message.provider !== "RESEND"
      || message.providerMessageId !== event.data.email_id
      || typeof message.externalTenantId !== "string" || !message.externalTenantId
      || !message.recipientValue) return null;

  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const values = metadata as Record<string, unknown>;
  const externalReference = values.external_reference;
  if (values.source !== "klassci" || values.workflow_event !== "announcement_email"
      || typeof externalReference !== "string"
      || !/^klassci-annonce-[1-9][0-9]*-courriel-[1-9][0-9]*$/.test(externalReference)) return null;

  const matched = Object.prototype.hasOwnProperty.call(PROVIDER_EVENTS, event.type)
    ? PROVIDER_EVENTS[event.type as keyof typeof PROVIDER_EVENTS] : null;
  if (!matched) return null;
  const [type, statuses] = matched;
  if (!(statuses as readonly string[]).includes(message.status)) return null;

  return {
    organizationId: message.organizationId,
    type,
    messageId: message.id,
    data: {
      occurred_at: event.created_at,
      message: {
        id: message.id,
        channel: "email",
        status: message.status.toLowerCase(),
        external_tenant_id: message.externalTenantId,
        recipient: { type: "email", value: message.recipientValue },
        metadata: {
          source: "klassci",
          workflow_event: "announcement_email",
          external_reference: externalReference,
        },
      },
    },
  };
}
