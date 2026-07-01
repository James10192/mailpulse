import { NextRequest } from "next/server";
import { runFilonRecoveryDueSteps } from "@/lib/filon-recovery/runner";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const stats = await runFilonRecoveryDueSteps(Number.isFinite(limit) ? limit : undefined);

  return Response.json(stats);
}
