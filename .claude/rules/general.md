---
description: General project conventions for MailPulse
globs: ["**/*.ts", "**/*.tsx"]
---

# General Rules

- Always use `pnpm` for package management
- TypeScript strict mode — no `any` types unless absolutely necessary
- Use path alias `@/` for imports from `src/`
- French for UI-facing text, English for code and comments
- Dark mode (zinc-950) with orange-500 accent — no rainbow gradients
- Geist Sans for interface, Geist Mono for code/data/metrics
- Use Server Components by default, `"use client"` only when needed
- Push client boundaries as deep as possible in the component tree
- All request APIs are async: `await cookies()`, `await headers()`, `await params`
- Use `proxy.ts` (not middleware.ts) for request interception
