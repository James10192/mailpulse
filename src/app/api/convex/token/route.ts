import { NextResponse } from "next/server";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { signMemberToken } from "@/lib/convex-auth";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Short-lived token the browser hands to Convex. The organization is the one
 * the dashboard itself resolves, so a member only ever reads their own data.
 */
export async function GET() {
  const { user, org } = await getCurrentUserAndOrg();
  if (!user || !org) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401, headers: NO_STORE });
  }

  try {
    const { token, expiresAt } = await signMemberToken({
      userId: user.id,
      organizationId: org.id,
      name: user.name?.trim() || user.email,
    });
    return NextResponse.json({ token, expiresAt }, { headers: NO_STORE });
  } catch (error) {
    console.error("[convex] jeton non signé", String(error));
    return NextResponse.json({ error: "Temps réel indisponible" }, { status: 503, headers: NO_STORE });
  }
}
