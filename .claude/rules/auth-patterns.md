---
description: Better Auth patterns and conventions
globs: ["**/auth*", "**/proxy*", "**/api/auth/**"]
---

# Auth Patterns

- Better Auth with Prisma adapter (NOT Convex)
- Auth route: `/api/auth/[...all]/route.ts` using `toNextJsHandler(auth)`
- Client: `createAuthClient()` with `organizationClient()` plugin
- Proxy: `src/proxy.ts` checks session cookie for protected routes
- Session cookie name: `better-auth.session_token`
- Refresh token is httpOnly cookie (never in JSON body)
- Organizations plugin for multi-tenant support
- Use `signIn.email()`, `signUp.email()`, `signOut()` from auth-client
- Google OAuth configured via `socialProviders.google`
- 2FA available via `twoFactor()` plugin (add when needed)
