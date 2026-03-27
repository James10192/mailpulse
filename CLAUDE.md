# MailPulse — Email Marketing Platform

## Project Overview
Email marketing campaign platform with tracking, analytics, automations, and real-time dashboards.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack, proxy.ts)
- **Auth**: Better Auth v1.5+ with Prisma adapter + Organization plugin
- **Database**: PostgreSQL via Prisma ORM (campaigns, contacts, events, analytics)
- **Real-time**: Convex (live dashboard, notifications, presence, activity feed)
- **Storage**: Cloudflare R2 via @aws-sdk/client-s3 (template assets, CSV imports)
- **Email**: Resend API (sending, webhooks, tracking)
- **UI**: Tailwind CSS v4 + shadcn/ui + Geist fonts + Lucide icons
- **Language**: TypeScript strict mode

## Architecture
- **Prisma** = relational data (campaigns, contacts, email events, analytics, templates, automations)
- **Convex** = real-time features only (live dashboard stats, notifications, presence, activity feed)
- **Better Auth** = auth layer with Prisma adapter (NOT Convex)
- **R2** = file storage (email assets, CSV imports, template thumbnails)

## Key Conventions
- Use `pnpm` (not npm/yarn)
- Dark mode by default (zinc-950 bg, zinc-50 text)
- Accent color: `orange-500` / `orange-600`
- Geist Sans for UI, Geist Mono for data/metrics
- French UI labels, English code/comments
- Port 8001 if 3000 is occupied (never 8000)
- No Co-Authored-By lines in commits

## File Structure
```
src/
├── app/
│   ├── (auth)/          # Login, register (public)
│   ├── (dashboard)/     # All authenticated pages
│   │   └── dashboard/   # Campaigns, contacts, analytics, templates, automations, settings
│   └── api/
│       ├── auth/        # Better Auth catch-all
│       ├── webhooks/    # Resend webhook handler
│       ├── track/       # Open pixel + click redirect
│       └── unsubscribe/ # One-click + browser unsubscribe
├── lib/                 # auth, prisma, r2, resend, tracking, utils
├── components/          # UI components (shadcn + custom)
├── hooks/               # React hooks
└── types/               # TypeScript types
prisma/                  # Prisma schema + migrations
convex/                  # Convex schema + functions (real-time only)
```

## Email Tracking System
- **Open tracking**: 1x1 transparent GIF pixel injected before `</body>`
- **Click tracking**: Links wrapped with 302 redirect via `/api/track/click`
- **Tokens**: HMAC-signed base64url tokens (recipientId:campaignId:hmac)
- **Unsubscribe**: List-Unsubscribe header (POST) + browser link (GET)
- **Webhooks**: Resend sends events to `/api/webhooks/email` (svix signature verification)

## Commands
```bash
pnpm dev              # Start Next.js dev server
pnpm build            # Production build
npx prisma studio     # Database GUI
npx prisma migrate dev # Run migrations
npx convex dev        # Start Convex dev server
vercel deploy         # Deploy preview to Vercel
vercel --prod         # Deploy to production
```

## CLI Tools (installed globally)
- `vercel` — Deploy, env vars, domains (`vercel login`)
- `neonctl` — Neon PostgreSQL management (`neonctl auth`)
- `npx convex` — Convex real-time backend (`npx convex login`)
- `wrangler` — Cloudflare R2, Workers (`wrangler login`)
- `resend` — Resend email API (`resend login`)
- `npx prisma` — Database migrations, studio (uses DATABASE_URL)

## Infrastructure IDs
- **Neon**: project `purple-frog-27708162` (MailPulse, aws-us-east-1)
- **R2 bucket**: `mailpulse`

## Environment Variables
See `.env.example` for all required variables.

@AGENTS.md

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
