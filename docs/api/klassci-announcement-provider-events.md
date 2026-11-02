# KLASSCI announcements: signed MailPulse delivery webhooks

MailPulse reuses its ordinary organization webhooks and retry cron. Create a webhook endpoint on the same organization as the email API key, at `https://<institution>/api/v1/mailpulse/announcement-events`, subscribing to `message.delivered`, `message.delivery_delayed`, `message.failed`, `message.bounced`, `message.complained`, `message.suppressed`.

Record the one-time signing secret securely in that institution's `MAILPULSE_ANNOUNCEMENT_WEBHOOK_SECRET`. KLASSCI checks `app.tenant_code` against `data.message.external_tenant_id`, optionally checks its configured MailPulse organization ID against `tenant_id`, and requires that the message ID, reference and recipient email all match one existing announcement delivery.

Only inbound events verified by Resend (svix) and correlated to an API-originated, RESEND email with matching provider ID are published. The payload has the normal MailPulse event envelope (`event_id`, `type`, `tenant_id`, `created_at`, `data`). `data.occurred_at` holds Resend's timestamp; `data.message` contains only the required correlation fields: id, channel, status, external_tenant_id, recipient and minimal metadata (source, workflow_event, external_reference). Email HTML/body and other private metadata are not forwarded.

MailPulse signs the *exact raw JSON* with `mailpulse-timestamp` and `mailpulse-signature: v1=<hex>`. During key rotation the signature header may contain two comma-separated signatures. KLASSCI accepts this standard format and the legacy raw-hex signature, always using the shared HMAC secret and a five-minute freshness window.

A delay is transient. Delivered/read require provider evidence; bounced, complained and suppressed are terminal and **must not trigger a new email**. Replayed provider callbacks may create a duplicate webhook delivery if they coincide with a crash, but KLASSCI applies a conditional status update that cannot regress terminal outcomes. Missed events are still reconciled by KLASSCI's authenticated GET /api/v1/messages/{messageId} polling. Do not enable broad retries of emails or replay a historical campaign.

Rollout: test sandbox signed callbacks for two institutions, provider failures and delayed delivery; configure the per-school webhook and verify MailPulse `POST /api/cron/process-webhooks` plus KLASSCI scheduled reconciliation. Neither a green CI nor a successful Resend HTTP response is proof of user delivery.

## Read-only lookup after a lost submission response

`GET /api/v1/messages/by-idempotency-key?key=<original_key>&tenant=<school_code>` (Bearer API key) returns the minimal current message result only if the **exact original API key**, organization, `external_tenant_id`, source and `external_reference` all match. A 404 cannot prove that a pending, lost, or in-flight submission was never accepted. Key rotations may make old submissions unavailable through this endpoint; do not pretend a new key owns historical sends. No request to this endpoint can send or retry a message.

A code tenant of `default` is disallowed. A reused idempotency key across several schools in the same MailPulse organization may collide; keep separate organizations/API keys per institution until the tenant-namespaced immutable attempt ledger has been migrated. Never modify historical idempotency keys in place.

## Versioned school-qualified references

Existing `klassci-annonce-12-courriel-581` keys stay readable and unchanged. For new messages KLASSCI can submit `klassci-v2-<tenant_code>-annonce-12-courriel-581`. The reference parser rejects `default`, invalid school codes, zero IDs, and suffixes; both the provider-event relay and read-only lookup compare the embedded school with `external_tenant_id`. Thus two institutions using the same MailPulse organization no longer collide on the same numeric announcement and delivery IDs. This does **not** replace per-institution API key and webhook configuration, and must not trigger re-submission of legacy messages.

## KLASSCI retry attempt references v3

A **new, approved** recipient attempt uses `klassci-v3-<tenant>-annonce-<id>-courriel-<id>-essai-<number>` with a positive, canonical attempt number. Original legacy/v2 message references and events remain readable and are **never renamed or replayed**. V3 references are accepted by the read-only GET-by-key and signed event relay only when the exact API key, organisation, tenant and metadata match. **The v3 format does not authorize a retry by itself:** KLASSCI must use an immutable attempt ledger, explicit permissions and provider/suppression checks; bounces/complaints remain terminal. Deploy this parser before KLASSCI begins issuing v3 attempts.

## Read-only Resend suppression gate

`GET /api/v1/messages/recipient-eligibility?email=...&tenant=...` requires the same authenticated MailPulse API key. It checks the authenticated environment's Resend suppression list without transmitting any email. 200 = suppressed, 404 = not listed. Other HTTP errors are 503 and MUST fail closed. It does not authorize a new send unless KLASSCI checks tenant, recipient identity, historical bounce, permission, idempotency and confirmed publication status. **Do not remove suppressions automatically.**
