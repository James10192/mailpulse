import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Paths that do not require authentication.
 * "/" is the marketing landing page — matched exactly (not with startsWith).
 * All others are prefix-matched.
 */
const publicPrefixes = [
  "/login",
  "/register",
  "/docs",
  "/en/docs",
  "/api/auth",
  "/api/webhooks",
  "/api/integrations",
  "/api/track",
  "/api/unsubscribe",
  "/api/contact",
  "/api/cron",
  "/api/health",
  "/contact",
  "/capture",
];

function isPublicPath(pathname: string): boolean {
  // Exact match for landing page
  if (pathname === "/") return true;

  // Prefix match for other public routes
  return publicPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for auth session cookie.
  // Better Auth uses "__Secure-" prefix on HTTPS (production),
  // and plain name on HTTP (local dev).
  const sessionCookie =
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("better-auth.session_token");

  if (!sessionCookie?.value) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
