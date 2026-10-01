# Changelog

All notable changes to MailPulse will be documented in this file.

## [Unreleased]

### Added

- **One WhatsApp number per external application, paired by QR code**: Settings › External applications › « Connecter un numéro WhatsApp » creates the Evolution instance, points its inbound webhook at the application, and records the number as the application's active sender once scanned. « Remplacer le numéro » logs the previous instance out only after the new one is linked.
- **Named API keys**: a key gets a name at creation (the application that will use it) and can be renamed in place from the list. The secret is shown once, in a dialog that only closes on an explicit click.
- **Messages linked to their API key**: every message sent through `POST /api/v1/messages` records the key that submitted it (`communication_message.apiKeyId`, migration `20260923120000_link_communication_message_to_api_key`). The key list shows each key's traffic over 30 days, linked to the registry filtered on that key.
- **Message registry**: outcome counters (delivered, sent, in progress, failed, cancelled) that filter on click, period and API key filters, statuses in French, failure reason under the status, relative dates, and a delivery timeline in the message sheet.
- shadcn/ui components: Sonner (toasts), Toggle, ToggleGroup, Accordion.
- **One WhatsApp number per application**: an API key can be attached to an application (`integration_api_key.applicationId`), and its WhatsApp messages leave from that application's number, the same one its signed commands use. Two applications of one organization (two schools, two brands) can share an email sender and send WhatsApp from different numbers. Keys without an application keep sending from the organization's number; a disabled application stops its keys. Migration `20261001120000_add_application_sender_routing`; `pnpm attach:api-keys` attaches existing keys (dry run by default, never to an existing application unless named with `--attach`).
- Messages created through the API or the Messaging page record the application and the WhatsApp account they left from, with a snapshot of that sender (`applicationId`, `senderAccountId`, `senderSnapshot`): a later change of number never rewrites history, and a replay leaves from the number the message was accepted for. A NO or STOP given to an application's number also refuses API messages from that number (`consent_refused`). A new key created under the name of an attached key joins its application.
- **Application and WhatsApp number in the key list**: each API key can be attached to an application from Platform, and the list says which WhatsApp number its messages leave from, or warns when that number is unavailable. A WhatsApp number can be named ("ESBTP Yakro") in External applications.
- Verification codes leave from the key's application number, like messages, and each verification records that number. A recipient who answered NO or STOP to that number gets `409 destinataire_refuse` instead of a code.
- **Platform overview**, the new default tab: messages, success rate, failures and in-progress over 24 hours, 7 or 30 days, each compared with the previous period and linked to the registry already filtered on what it counts. Health per channel and per WhatsApp number (the organization's and each application's), failure causes in French with what to do, and a short list of what changed (failure rate up, volume down, new failure cause, failing number). Signed commands from external applications are counted alongside API and direct messages.
- Registry filters by application and by WhatsApp number, and a shareable link to one message (`?message=`). The message sheet shows the number it left from.
- **Reliable webhooks**: a failed delivery is retried after 1 min, 5 min, 30 min, 2 h and 6 h (timeouts, network errors, 408, 429 and 5xx only), each call times out after 3 seconds inside the sending request and 10 seconds on retries, a delivery interrupted by a crash is picked up again, and one unreachable receiver no longer holds up the others. Retries stop when the plan no longer includes webhooks. New cron `POST /api/cron/process-webhooks`, run every 5 minutes.
- **Webhook secret rotation** without losing events: `POST /api/v1/webhooks/{id}/rotate-secret` returns a new secret once, and for 24 hours each request carries both signatures (`v1=<new>,v1=<old>`). Receivers that compare the whole header with `v1=<signature>` must accept several comma-separated signatures before their first rotation.
- **Platform › Webhooks** tab: health of each receiving endpoint over 7 days, delivery log filterable by endpoint and status with the next retry time, manual resend of a failed delivery, enable or disable an endpoint, and secret rotation; actions reserved to owners and admins.
- The overview, the message registry and the webhook log refresh every 30 seconds while the page is in front of you; a switch turns it off.

### Changed
- Creating, renaming or revoking an API key (MailPulse or Filon), changing an email sender and configuring or pairing the organization's WhatsApp are reserved to owners and admins; other members keep sending.
- `ConfirmDialog`, `ContactDialog` and `HelpModal` are built on the shadcn Dialog/AlertDialog: focus trap, Escape to close, screen-reader roles. Their props are unchanged.
- The platform tab is kept in the URL (`?tab=`), so links and reloads land on the right tab.
- The platform page loads only the open tab's data, and the 14-day volume chart is counted by the database instead of loading every message of the fortnight. New indexes `communication_message (organizationId, applicationId, createdAt)`, `(organizationId, senderAccountId, createdAt)` and `external_transport_operation (organizationId, direction, createdAt)`, built concurrently.
- In the message registry, recipients, contact details, message contents, metadata and provider error texts are masked for members who do not manage the organization, as in the SMS history; they search by message identifier only. Owners and admins see everything unchanged. A link to the registry without a tab still opens the registry.
- Every dashboard screen uses the shadcn/ui components instead of hand-made controls: contacts (list, detail, add panel, CSV import), segments, tags, custom fields, senders, domains, capture pages, automations and the workflow editor, campaign creation and sending, onboarding, notifications, theme toggle and the rich editor toolbar. New shared components: Checkbox, Slider, ScrollArea, Progress, plus PageHint, FormDialog, TypedSelect and SingleChoiceGroup. Page explanations that used blue info banners, outside the MailPulse palette, are now neutral notes (`PageHint`, announced as a note, not an alert); compact buttons keep a 44px touch target on mobile; missing French accents were restored.

### Security
- Webhook URLs must be public HTTPS addresses: local, internal and private addresses are refused at creation and before every call, every address a name resolves to is checked at connection time, and redirects are not followed. Existing `http://` endpoints stop receiving and are flagged in Platform › Webhooks. Members who do not manage the organization see only a webhook's domain.

### Fixed
- Resend events for one message arriving together (sent, delivered, opened within seconds) could conflict: the losing one answered 500 and waited for Resend's retry. It is now replayed at once, after a short random wait, and all serializable transactions replay that way.
- An unreachable webhook receiver could hold a message dispatch indefinitely: calls had no timeout. A failed delivery was also never retried.
- A signed command retried after its application changed numbers was sent from the new number while still recorded on the old one; it now moves to the current number before any gate, and only while it has never left.
- A WhatsApp template without a Meta template id failed as an unknown submission after a provider call that never happened; it now fails as `template_not_configured` before any call.
- Creating an API key failed with "Expéditeur invalide" when the default sender's domain was not verified; unverified senders are now shown disabled and never preselected.
- The Filon key revoke action could revoke any key of the organization, MailPulse keys included; it is now limited to active Filon keys.
- `truncate` never truncated a `<p>` or a heading: the global `text-wrap` rules were unlayered and reset the wrap mode. They now live in `@layer base`.
- A bare `border` rendered black (Tailwind v4 uses `currentColor`); the theme border color is now the default, as in shadcn's base styles.

### Security
- **Live dashboard data requires a signed identity**: the real-time functions (stats, activity feed, notifications, presence, message mirror) took an organization or user id from the caller with no check, so anyone holding the public Convex URL could read another organization's feed and notifications or write into them. They now read the identity from a short-lived ES256 token signed by MailPulse (`/api/convex/token` for members, a server token for MailPulse's own writes); stats, activity, notifications and the message mirror can only be written by the server.

## [0.2.0] - 2026-03-28

### Added
- **Hierarchical sidebar** with collapsible sub-menus (Campaigns > Snippets/Calendar, Contacts > Tags/Fields/Segments, Envoi > Expediteurs/Domaines)
- **Cmd+K search palette** with navigation to all pages and quick actions
- **Quick Actions** on dashboard (New campaign, Add contact, New workflow)
- **Activity Timeline** on dashboard with real-time email event feed
- **Onboarding wizard** 5-step post-registration flow (Business info, Survey, Domain, Email sender, Done)
- **Tags page** with Prisma groupBy and subscriber counts
- **Segments page** with dynamic contact list filters
- **Custom Fields page** (placeholder for future)
- **Email Senders page** with sender management
- **Domains page** with SPF/DKIM/DMARC verification status
- **Snippets page** for reusable email blocks (placeholder)
- **Calendar page** with monthly view and scheduled campaign markers
- **Contacts CRUD** with slide-over panel (add/delete) and Zod validation
- **Campaign wizard** 3-step creation flow (Info > Content > Preview)
- **Server Actions** for contacts and campaigns with `useActionState`
- **Dark/Light/System theme toggle** with next-themes + Tailwind v4 `@custom-variant`
- **Collapsible sidebar** with localStorage persistence
- **Responsive navbar** with hamburger mobile menu
- **Dynamic favicon** (mail icon) and OG image
- **Google OAuth** and **GitHub OAuth** integration
- **PostHog** analytics integration
- **9 documentation pages** (Getting started, API reference, Webhooks, etc.)
- **West Africa section** on landing page (FCFA pricing, French support, local deliverability)

### Fixed
- Tailwind v4 dark mode: `@custom-variant dark` for class-based toggling
- Prisma 7: driver adapter, custom output path, `datasourceUrl` in constructor
- Resend v6: `svix` for webhook verification, `replyTo` camelCase
- Vercel env vars: `printf` instead of `echo` (no trailing newlines)
- Light mode: proper border/bg classes on all dashboard pages
- Sidebar/header border alignment (h-14 exact match)
- SignOut redirect to /login
- Cursor-pointer on all interactive elements

### Improved
- Code reuse: extracted `getEmailEventStats()`, `getCurrentUserAndOrg()`
- N+1 fix: `createMany` for contact tags
- `Promise.all` for parallel Prisma queries
- Type-safe `updateField` with `keyof`
- Bounded queries with `take: 50`
- Delete error handling with user feedback

## [0.1.0] - 2026-03-27

### Added
- **Project scaffolding**: Next.js 16 with App Router, Turbopack, TypeScript, Tailwind CSS v4
- **Authentication**: Better Auth v1.5 with Prisma adapter, email/password, Google OAuth, organizations plugin
- **Database schema**: Full Prisma schema with 16 models — users, organizations, contacts, campaigns, email events, templates, automations, sending domains
- **Real-time layer**: Convex schema + functions for live dashboard stats, notifications, campaign progress, user presence, activity feed
- **Email tracking**: Open pixel (1x1 GIF), click redirect (302), HMAC-signed tokens, unsubscribe (one-click + browser)
- **Webhook handler**: Resend webhook endpoint with svix signature verification, bounce/complaint/delivery processing
- **Cloudflare R2**: File storage integration via @aws-sdk/client-s3 (upload, presigned URLs, delete)
- **Email sending**: Resend integration with List-Unsubscribe headers, campaign tags, tracking injection
- **Dashboard UI**: Landing page, auth pages (login/register), dashboard layout with sidebar navigation
- **Dashboard pages**: Overview stats, campaigns list, contacts management, analytics KPIs, templates gallery, automations presets, settings
- **Design system**: Dark mode (zinc-950), orange accent, Geist fonts, minimal fintech aesthetic
- **Claude Code config**: CLAUDE.md, 5 rule files (general, email-tracking, prisma, auth, convex), project structure documentation
- **Proxy**: Request interception for auth-protected routes (proxy.ts)
- **Docker**: PostgreSQL via docker-compose for local development

### Technical Decisions
- **Prisma** for relational data (campaigns, contacts, analytics) — complex queries, aggregations, indexes
- **Convex** for real-time only (live dashboard, notifications, presence) — instant reactivity
- **Resend** for email sending — modern API, webhook events, unlimited contacts
- **Cloudflare R2** for storage — S3-compatible, no egress fees
- **Better Auth** over Auth.js — active development, native Prisma adapter, org plugin
