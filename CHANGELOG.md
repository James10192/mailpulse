# Changelog

All notable changes to MailPulse will be documented in this file.

## [Unreleased]

### Added
- **Named API keys**: a key gets a name at creation (the application that will use it) and can be renamed in place from the list. The secret is shown once, in a dialog that only closes on an explicit click.
- **Messages linked to their API key**: every message sent through `POST /api/v1/messages` records the key that submitted it (`communication_message.apiKeyId`, migration `20260923120000_link_communication_message_to_api_key`). The key list shows each key's traffic over 30 days, linked to the registry filtered on that key.
- **Message registry**: outcome counters (delivered, sent, in progress, failed, cancelled) that filter on click, period and API key filters, statuses in French, failure reason under the status, relative dates, and a delivery timeline in the message sheet.
- shadcn/ui components: Sonner (toasts), Toggle, ToggleGroup, Accordion.

### Changed
- `ConfirmDialog`, `ContactDialog` and `HelpModal` are built on the shadcn Dialog/AlertDialog: focus trap, Escape to close, screen-reader roles. Their props are unchanged.
- The platform tab is kept in the URL (`?tab=`), so links and reloads land on the right tab.

### Fixed
- Creating an API key failed with "Expéditeur invalide" when the default sender's domain was not verified; unverified senders are now shown disabled and never preselected.
- The Filon key revoke action could revoke any key of the organization, MailPulse keys included; it is now limited to active Filon keys.
- `truncate` never truncated a `<p>` or a heading: the global `text-wrap` rules were unlayered and reset the wrap mode. They now live in `@layer base`.
- A bare `border` rendered black (Tailwind v4 uses `currentColor`); the theme border color is now the default, as in shadcn's base styles.

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
