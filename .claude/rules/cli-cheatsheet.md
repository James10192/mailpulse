---
description: CLI cheat sheet for all project tools — Wrangler R2, Neon, Convex, Vercel, Resend
globs: ["**/*"]
---

# CLI Cheat Sheet

## Wrangler (Cloudflare R2)

### Auth & Info
- `wrangler login` — Browser auth
- `wrangler whoami` — Show account + Account ID

### Buckets
- `wrangler r2 bucket create <NAME>` — Create bucket
- `wrangler r2 bucket list` — List all buckets
- `wrangler r2 bucket delete <BUCKET>` — Delete bucket (must be empty)
- `wrangler r2 bucket info <BUCKET>` — Bucket details
- `wrangler r2 bucket dev-url enable <BUCKET> -y` — Enable public dev URL
- `wrangler r2 bucket dev-url get <BUCKET>` — Get bucket dev URL

### Objects
- `wrangler r2 object put <BUCKET>/<KEY> --file=<PATH>` — Upload
- `wrangler r2 object get <BUCKET>/<KEY> --file=<OUTPUT>` — Download
- `wrangler r2 object delete <BUCKET>/<KEY>` — Delete

### R2 S3-Compatible API Tokens
- Created via **Dashboard > R2 object storage > Account Details > Manage API Tokens**
- NOT via wrangler CLI (no `wrangler r2 token` command exists)
- Permissions: Admin Read & Write, Admin Read only, Object Read & Write, Object Read only
- Object-level perms can be scoped to specific buckets
- Creates: **Access Key ID** (Client ID) + **Secret Access Key** (Client Secret)
- **Secret Access Key is shown ONLY ONCE** — save immediately
- S3 Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`
- Account ID visible via `wrangler whoami` or dashboard bottom-left
- Can also create via Cloudflare API: Access Key ID = token `id`, Secret = SHA-256 of token `value`

---

## Neon (PostgreSQL)

### Auth
- `neonctl auth` — Browser auth
- `neonctl me` — Show current user

### Projects
- `neonctl projects list` — List projects
- `neonctl projects create --name <NAME> --region-id <REGION>` — Create project
- `neonctl projects get <PROJECT_ID>` — Project details
- `neonctl projects delete <PROJECT_ID>` — Delete project

### Connection Strings
- `neonctl connection-string <PROJECT_ID>` — Direct connection
- `neonctl connection-string <PROJECT_ID> --pooled` — With connection pooling (recommended for apps)

### Branches
- `neonctl branches list <PROJECT_ID>` — List branches
- `neonctl branches create <PROJECT_ID> --name <NAME>` — Create branch
- `neonctl branches schema-diff <PROJECT_ID> <BRANCH_A> <BRANCH_B>` — Compare schemas

### Context
- `neonctl set-context --project-id <PROJECT_ID>` — Set default project

---

## Convex

### Dev
- `npx convex dev` — Start dev server (watches files)
- `npx convex dev --once` — Sync once then exit
- `npx convex dashboard` — Open dashboard in browser

### Data
- `npx convex data` — List all tables
- `npx convex data <TABLE>` — Show table contents
- `npx convex export --path <DIR>` — Export all data
- `npx convex import --table <TABLE> <FILE>` — Import data

### Deploy
- `npx convex deploy` — Deploy to production
- `npx convex deploy --cmd "pnpm run build"` — Deploy with build step

### Environment Variables
- `npx convex env list` — List env vars
- `npx convex env set <VAR> <VALUE>` — Set env var (dev)
- `npx convex env set <VAR> <VALUE> --prod` — Set env var (prod)
- `npx convex env unset <VAR>` — Remove env var

### Monitoring
- `npx convex logs` — Stream logs
- `npx convex insights` — Health metrics
- `npx convex run <functionName> [args]` — Execute a function

---

## Vercel

### Deploy
- `vercel` — Preview deployment
- `vercel --prod` — Production deployment
- `vercel deploy --prebuilt` — Deploy build output only

### Environment
- `vercel env ls` — List env vars
- `vercel env add <NAME>` — Add env var (interactive)
- `vercel env pull .env.local` — Pull env vars to local file
- `vercel link` — Link local project to Vercel

### Monitoring
- `vercel logs <URL>` — View function logs
- `vercel inspect <URL>` — Deployment details

---

## Resend

### Auth
- `resend login` — Browser auth + API key

### Operations
- `resend api-keys list` — List API keys
- `resend emails send --from "x" --to "y" --subject "z" --html "<p>test</p>"` — Send email
- `resend domains list` — List verified domains
- `resend domains add <DOMAIN>` — Add sending domain
