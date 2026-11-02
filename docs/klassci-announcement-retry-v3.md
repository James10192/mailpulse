# KLASSCI announcement retries — MailPulse v3 contract

Existing v1/v2 keys and their delivery history are preserved. v3 references are new immutable attempt IDs:

`klassci-v3-<tenant>-annonce-<announcement_id>-courriel-<delivery_id>-essai-<N>` where N >= 2.

To submit v3 with POST /api/v1/messages:
- Same API key and organization as the original attempt.
- metadata.source=klassci, workflow_event=announcement_email, external_tenant_id=<tenant>, external_reference=<new v3 key>, retry_of=<immediately preceding reference>.
- Exact same email recipient, school and announcement/delivery reference.
- The preceding MailPulse record must be FAILED with no providerMessageId and an explicit pre-dispatch failure (`template_not_configured` or `channel_not_configured`).
- An address with recorded `email_bounced`, `email_suppressed` or `email_complained` is blocked for the organization.
- A retry of an existing v3 request keeps the original idempotency claim; only a *new* v3 claim checks the prior proof.
- All ambiguous/timeouts, delivered, submitted, delayed and other failures are refused with HTTP 409 `retry_not_authorized`.

**Important:** This is provider-side protection, not an endpoint that authorizes mass mailing or unsuppresses recipients. It does not backfill missing attempts, alter historical references, or automatically resend anything. A source application must create its own immutable attempts and authorization/audit trail before issuing v3 keys.

Read-only reconciliation still uses GET /api/v1/messages/by-idempotency-key?key=...&tenant=...; never POST for a lookup.

Related: https://resend.com/changelog/email-suppression-visibility and https://laravel.com/docs/12.x/queues.