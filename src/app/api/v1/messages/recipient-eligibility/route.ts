import { authenticateApiRequest } from "@/lib/mailpulse/api-keys";
import { normalizeEligibilityResponse } from "@/lib/mailpulse/announcement-suppression-check";

/**
 * Read-only provider suppression check, on the API key's Resend team.
 * Fail closed on ANY unexpected response. Never remove suppressions.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) return Response.json({ error: "Invalid API key" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const email = (params.get("email") ?? "").trim().toLowerCase();
  const tenant = (params.get("tenant") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254
      || !/^[a-z0-9][a-z0-9_-]{1,62}$/.test(tenant) || tenant === "default") {
    return Response.json({ error: "Invalid address or tenant" }, { status: 422 });
  }
  // The sending key's organization is bound by authenticateApiRequest; the
  // resulting eligibility is scoped to the configured Resend team.
  const key = process.env.RESEND_API_KEY;
  if (!key) return Response.json({ error: "Suppression check unavailable" }, { status: 503 });

  try {
    const response = await fetch("https://api.resend.com/suppressions/" + encodeURIComponent(email), {
      method: "GET",
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const result = normalizeEligibilityResponse(response.status);
    if (!result) return Response.json({ error: "Suppression check unavailable" }, { status: 503 });
    return Response.json({
      eligible: result.eligible,
      suppressed: result.suppressed,
      tenant,
      email,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Suppression check unavailable" }, { status: 503 });
  }
}
