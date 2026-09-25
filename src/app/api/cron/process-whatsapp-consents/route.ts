import { processConsentQueue } from "@/lib/external-applications/consent-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Expires unanswered consent requests, then sends at most the next paced
 * message of every sending account. Called repeatedly by the scheduler: the
 * run itself never waits out the pause between two messages.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const result = await processConsentQueue();
  return Response.json(result);
}
