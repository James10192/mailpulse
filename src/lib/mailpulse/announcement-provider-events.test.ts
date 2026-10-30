import assert from "node:assert/strict";
import test from "node:test";
import { announcementProviderEvent, type AnnouncementEmailMessage } from "./announcement-provider-events";
import { parseResendWebhookPayload } from "./resend-webhook-payload";

const message: AnnouncementEmailMessage = {
  id: "mp-msg-7", organizationId: "org-esbtp", origin: "API",
  channel: "EMAIL", recipientType: "EMAIL", recipientValue: "eleve@example.ci",
  provider: "RESEND", providerMessageId: "resend-11",
  status: "DELIVERED", externalTenantId: "esbtp-abidjan",
  metadata: {
    source: "klassci", workflow_event: "announcement_email",
    external_reference: "klassci-annonce-1-courriel-7",
    email_html: "<p>DONNEES PRIVEES</p>",
  },
};
function event(type: string) {
  const result = parseResendWebhookPayload({
    type, created_at: "2026-10-30T00:00:00Z", data: { email_id: "resend-11" },
  });
  assert.equal(result.kind, "event");
  return result.event;
}
test("only verified provider outcomes for this exact KLASSCI message leave a minimal signed webhook payload", () => {
  const result = announcementProviderEvent(event("email.delivered"), message);
  assert.equal(result?.type, "message.delivered");
  assert.equal(result?.organizationId, "org-esbtp");
  assert.equal(result?.messageId, "mp-msg-7");
  assert.equal(result?.data.message.external_tenant_id, "esbtp-abidjan");
  assert.equal(result?.data.message.metadata.external_reference, "klassci-annonce-1-courriel-7");
  assert.equal(result?.data.occurred_at, "2026-10-30T00:00:00Z");
  assert.equal(JSON.stringify(result).includes("DONNEES PRIVEES"), false);
});
test("wrong provider, tenant, API origin, reference or message status never emits a confirmation", () => {
  const source = event("email.delivered");
  for (const changes of [
    { status: "SENT" }, { origin: "CAMPAIGN" }, { channel: "WHATSAPP" },
    { provider: "UNSPECIFIED" }, { providerMessageId: "another-provider-id" },
    { externalTenantId: null }, { recipientType: "PHONE" },
    { metadata: { source: "klassci", workflow_event: "announcement_email", external_reference: "other" } },
  ]) assert.equal(announcementProviderEvent(source, { ...message, ...changes }), null);
  assert.equal(announcementProviderEvent(source, null), null);
});
test("delays remain transient, hard bounce and complaints stay failed, opened and sent are not asserted delivered", () => {
  assert.equal(announcementProviderEvent(event("email.delivery_delayed"), { ...message, status: "SENT" })?.type, "message.delivery_delayed");
  assert.equal(announcementProviderEvent(event("email.delivery_delayed"), message), null);
  assert.equal(announcementProviderEvent(event("email.bounced"), { ...message, status: "FAILED" })?.type, "message.bounced");
  assert.equal(announcementProviderEvent(event("email.complained"), { ...message, status: "FAILED" })?.type, "message.complained");
  assert.equal(announcementProviderEvent(event("email.suppressed"), { ...message, status: "FAILED" })?.type, "message.suppressed");
  assert.equal(announcementProviderEvent(event("email.failed"), { ...message, status: "FAILED" })?.type, "message.failed");
  assert.equal(announcementProviderEvent(event("email.opened"), { ...message, status: "READ" }), null);
  assert.equal(announcementProviderEvent(event("email.sent"), { ...message, status: "SENT" }), null);
});

test("provider event rejects tenant mismatch for versioned school references", () => {
  const ref = "klassci-v2-esbtp-abidjan-annonce-1-courriel-7";
  const data = { ...message, metadata: {
    source: "klassci", workflow_event: "announcement_email", external_reference: ref,
  } };
  assert.equal(announcementProviderEvent(event("email.delivered"), data)?.data.message.metadata.external_reference, ref);
  assert.equal(announcementProviderEvent(event("email.delivered"), { ...data, externalTenantId: "esbtp-yakro" }), null);
  assert.equal(announcementProviderEvent(event("email.delivered"), { ...data, externalTenantId: "default" }), null);
});
