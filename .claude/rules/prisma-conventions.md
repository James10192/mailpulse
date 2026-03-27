---
description: Prisma ORM conventions and patterns
globs: ["**/prisma/**", "**/lib/prisma*", "**/*.prisma"]
---

# Prisma Conventions

- All table names use `@@map("snake_case")`
- Use `cuid()` for IDs (not uuid)
- Always add `@@index` for frequently queried fields
- Use `onDelete: Cascade` for child relations
- Singleton PrismaClient via `globalForPrisma` pattern (see lib/prisma.ts)
- Run `npx prisma migrate dev --name descriptive_name` for migrations
- Run `npx auth@latest generate` after changing Better Auth config
- **Prisma 7**: datasource `url` goes in `prisma.config.ts`, NOT in `schema.prisma`
- **Prisma 7**: `prisma.config.ts` must load `.env.local` explicitly via `config({ path: ".env.local" })`
- Always install `dotenv` as devDep for prisma.config.ts
- Enum values are UPPER_CASE
- Json fields for flexible metadata (don't over-normalize)
- Use `upsert` for analytics aggregation updates
