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
- Enum values are UPPER_CASE
- Json fields for flexible metadata (don't over-normalize)
- Use `upsert` for analytics aggregation updates
