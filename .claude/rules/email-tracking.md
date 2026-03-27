---
description: Email tracking implementation patterns
globs: ["**/track/**", "**/tracking*", "**/webhook*", "**/resend*"]
---

# Email Tracking Rules

## Open Tracking
- Use 1x1 transparent GIF pixel (not PNG)
- Inject pixel before `</body>` tag
- Include `no-cache` headers on pixel response
- Open tracking is unreliable (Apple Mail Privacy, Gmail caching) — always pair with click tracking

## Click Tracking
- Wrap links using 302 redirect (not 301, not meta refresh)
- Never wrap `mailto:` links or unsubscribe links
- Tracking URL format: `/api/track/click?url=ENCODED_URL&t=TOKEN`
- Token must be HMAC-signed (verifyTrackingToken)

## Webhooks
- Always verify Resend svix signatures in production
- Process events idempotently (same event may arrive multiple times)
- Hard bounce → immediately mark contact as unsubscribed
- Complaint → immediately suppress contact
- Use fire-and-forget for non-critical event logging

## Unsubscribe
- Always include `List-Unsubscribe` and `List-Unsubscribe-Post` headers
- Support both POST (one-click from email client) and GET (browser link)
- Process unsubscribes immediately (< 48h for compliance, we do instant)
- GDPR: consent records must be maintained
