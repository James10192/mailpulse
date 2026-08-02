import { processDueExternalApplicationCallbacks } from "@/lib/external-applications/meta-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rawLimit = new URL(request.url).searchParams.get("limit");
  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : 50;
  const result = await processDueExternalApplicationCallbacks(Number.isFinite(parsedLimit) ? parsedLimit : 50);
  return Response.json(result);
}
