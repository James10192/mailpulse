# KLASSCI announcements: signed MailPulse delivery webhooks

MailPulse reuses its ordinary organization webhooks and retry cron. Create a webhook endpoint on the same organization as the email API key, at `https://<institution>/api/v1/mailpulse/announcement-events`, subscribing to `message.delivered`, `message.delivery_delayed`, `message.failed`, `message.bounced`, `message.complained`, `message.suppressed`.

Record the one-time signing secret securely in that institution's `MAILPULSE_ANNOUNCEMENT_WEBHOOK_SECRET`. KLASSCI checks `app.tenant_code` against `data.message.external_tenant_id`, optionally checks its configured MailPulse organization ID against `tenant_id`, and requires that the message ID, reference and recipient email all match one existing announcement delivery.

Only inbound events verified by Resend (svix) and correlated to an API-originated, RESEND email with matching provider ID are published. The payload has the normal MailPulse event envelope (`event_id`, `type`, `tenant_id`, `created_at`, `data`). `data.occurred_at` holds Resend's timestamp; `data.message` contains only the required correlation fields: id, channel, status, external_tenant_id, recipient and minimal metadata (source, workflow_event, external_reference). Email HTML/body and other private metadata are not forwarded.

MailPulse signs the *exact raw JSON* with `mailpulse-timestamp` and `mailpulse-signature: v1=<hex>`. During key rotation the signature header may contain two comma-separated signatures. KLASSCI accepts this standard format and the legacy raw-hex signature, always using the shared HMAC secret and a five-minute freshness window.

A delay is transient. Delivered/read require provider evidence; bounced, complained and suppressed are terminal and **must not trigger a new email**. Replayed provider callbacks may create a duplicate webhook delivery if they coincide with a crash, but KLASSCI applies a conditional status update that cannot regress terminal outcomes. Missed events are still reconciled by KLASSCI's authenticated GET /api/v1/messages/{messageId} polling. Do not enable broad retries of emails or replay a historical campaign.

Rollout: test sandbox signed callbacks for two institutions, provider failures and delayed delivery; configure the per-school webhook and verify MailPulse `POST /api/cron/process-webhooks` plus KLASSCI scheduled reconciliation. Neither a green CI nor a successful Resend HTTP response is proof of user delivery.
