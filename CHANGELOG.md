# Changelog

All notable changes to MailPulse will be documented in this file.

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
