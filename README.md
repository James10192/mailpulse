<p align="center">
  <img src="https://img.icons8.com/fluency/96/email-open.png" alt="MailPulse" width="80" />
</p>

<h1 align="center">MailPulse</h1>

<p align="center">
  <strong>Open-source email marketing platform with real-time analytics</strong>
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#tech-stack">Stack</a> &bull;
  <a href="#getting-started">Setup</a> &bull;
  <a href="#architecture">Architecture</a> &bull;
  <a href="#roadmap">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-000?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/License-MIT-orange" alt="MIT" />
</p>

---

## Features

### Core
- **Campaign Management** — Create, schedule, A/B test, and send email campaigns
- **Contact Management** — Import CSV, tags, segments, dynamic lists, engagement scoring
- **Email Templates** — Drag & drop builder with reusable templates
- **Real-time Dashboard** — Live stats powered by Convex (opens, clicks, bounces)

### Tracking & Analytics
- **Open Tracking** — 1x1 transparent pixel with HMAC-signed tokens
- **Click Tracking** — Link wrapping with 302 redirect, per-link analytics
- **Bounce Handling** — Automatic hard/soft bounce detection via webhooks
- **Complaint Detection** — Instant suppression on spam complaints
- **Unsubscribe** — One-click (RFC 8058) + browser link, GDPR compliant

### Automation
- **Drip Campaigns** — Multi-step email sequences with delays
- **Trigger-based Workflows** — New subscriber, tag added, link clicked, date-based
- **Conditional Logic** — If/then branching in automation flows

### Infrastructure
- **Multi-tenant** — Organizations with role-based access (Better Auth)
- **Deliverability** — SPF/DKIM/DMARC domain verification dashboard
- **Security** — Credential stuffing protection, bot detection (Better Auth Infra)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Auth** | Better Auth + Organizations + Infra (dash, sentinel) |
| **Database** | PostgreSQL (Neon) via Prisma 7 |
| **Real-time** | Convex (live dashboard, notifications, presence) |
| **Email** | Resend API (sending, webhooks, tracking) |
| **Storage** | Cloudflare R2 (S3-compatible, zero egress) |
| **UI** | Tailwind CSS v4 + shadcn/ui + Geist + Lucide |
| **Deploy** | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 10+
- Docker (for local PostgreSQL) or a Neon account

### 1. Clone & Install

```bash
git clone https://github.com/James10192/mailpulse.git
cd mailpulse
pnpm install
```

### 2. Environment

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Database

```bash
# Option A: Local PostgreSQL
docker compose up -d
npx prisma migrate dev --name init

# Option B: Neon (cloud)
# Set DATABASE_URL in .env.local, then:
npx prisma migrate dev --name init
```

### 4. Convex (real-time)

```bash
npx convex dev
```

### 5. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
                    Client (Browser)
                         |
                    Next.js 16 App
                    /     |      \
               Prisma   Convex   Cloudflare R2
              (Neon DB)  (Real-time)  (Storage)
                 |         |           |
            Campaigns   Dashboard   Templates
            Contacts    Notifications  Assets
            Events      Presence     CSV Imports
            Analytics   Activity
                 |
              Resend API
            (Email Sending)
                 |
            Webhooks ───> /api/webhooks/email
            Tracking ───> /api/track/open + /api/track/click
```

**Why hybrid Prisma + Convex?**
- **Prisma/PostgreSQL**: Complex queries, aggregations, relational data (campaigns, contacts, analytics)
- **Convex**: Instant reactivity for live features (dashboard updates, notifications, team presence)

---

## Roadmap

- [x] Project scaffolding + auth + database schema
- [x] Email tracking (open pixel, click redirect, unsubscribe)
- [x] Webhook handler (Resend events)
- [x] Dashboard UI (campaigns, contacts, analytics, templates, automations, settings)
- [ ] Drag & drop email editor
- [ ] CSV contact import with mapping
- [ ] Campaign sending engine with rate limiting
- [ ] A/B testing with auto-winner selection
- [ ] Automation workflow builder (visual)
- [ ] Send time optimization (ML-based)
- [ ] AI subject line generator
- [ ] Revenue attribution & cohort analysis
- [ ] Mobile app (React Native)

---

## License

MIT
