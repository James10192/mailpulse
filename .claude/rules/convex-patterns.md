---
description: Convex real-time layer patterns
globs: ["**/convex/**"]
---

# Convex Rules

- Convex is for REAL-TIME features ONLY (not relational data)
- Tables: dashboardStats, notifications, campaignProgress, presence, activityFeed
- Use `useQuery` for reactive data, `useMutation` for writes
- Always define indexes for query patterns
- Use `v.union(v.literal(...))` for enum-like values
- Timestamps as `v.number()` (Date.now())
- Keep Convex functions small and focused
- Sync from Prisma → Convex when events occur (webhook → update both)
