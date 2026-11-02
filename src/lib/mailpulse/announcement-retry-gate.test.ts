import assert from "node:assert/strict";
import test from "node:test";
import {
  precedingAnnouncementReference,
  priorAttemptPermitsRetry,
  type RetryEvidence,
} from "./announcement-retry-gate";

const previous = "klassci-v2-esbtp-abidjan-annonce-2-courriel-581";
const current = "klassci-v3-esbtp-abidjan-annonce-2-courriel-581-essai-2";

const safe: RetryEvidence = {
  origin: "API", channel: "EMAIL", recipientType: "EMAIL",
  recipientValue: "student@example.test", externalTenantId: "esbtp-abidjan",
  idempotencyKey: previous, status: "FAILED",
  errorCode: "template_not_configured", providerMessageId: null,
  metadata: {
    source: "klassci",
    workflow_event: "announcement_email",
    external_reference: previous,
  },
};

test("only a prior pre-dispatch failure permits attempt #2", () => {
  assert.equal(precedingAnnouncementReference(current), previous);
  assert.equal(priorAttemptPermitsRetry(safe, previous, current, "esbtp-abidjan", safe.recipientValue, false), true);
  assert.equal(precedingAnnouncementReference("klassci-v3-esbtp-abidjan-annonce-2-courriel-581-essai-3"), current);
});

test("refuse a bounced, suppressed, complained, delayed or uncertain prior outcome", () => {
  for (const changes of [
    { status: "SENT" }, { status: "DELIVERED" }, { status: "SUBMISSION_UNKNOWN" },
    { status: "RETRYING" }, { status: "QUEUED" },
    { errorCode: "email_bounced" }, { errorCode: "email_suppressed" },
    { errorCode: "email_complained" }, { errorCode: "email_failed" },
    { errorCode: "submission_unknown" }, { providerMessageId: "resend-id" },
    { metadata: null }, { origin: "CAMPAIGN" }, { recipientType: "PHONE" },
    { externalTenantId: "esbtp-yakro" }, { recipientValue: "another@example.test" },
    { idempotencyKey: "forged" },
  ]) {
    assert.equal(
      priorAttemptPermitsRetry({ ...safe, ...changes }, previous, current, "esbtp-abidjan", safe.recipientValue, false),
      false, JSON.stringify(changes),
    );
  }
  assert.equal(priorAttemptPermitsRetry(safe, previous, current, "esbtp-abidjan", safe.recipientValue, true), false);
  assert.equal(priorAttemptPermitsRetry(safe, previous, current, "esbtp-yakro", safe.recipientValue, false), false);
  assert.equal(priorAttemptPermitsRetry(safe, previous, current, "esbtp-abidjan", "another@example.test", false), false);
  assert.equal(priorAttemptPermitsRetry(null, previous, current, "esbtp-abidjan", safe.recipientValue, false), false);
});

test("never skip an attempt number or fall back to legacy", () => {
  const next = "klassci-v3-esbtp-abidjan-annonce-2-courriel-581-essai-3";
  assert.equal(priorAttemptPermitsRetry(safe, previous, next, "esbtp-abidjan", safe.recipientValue, false), false);
  assert.equal(precedingAnnouncementReference("klassci-annonce-2-courriel-581"), null);
  assert.equal(precedingAnnouncementReference("klassci-v3-esbtp-abidjan-annonce-2-courriel-581-essai-1"), null);
});
