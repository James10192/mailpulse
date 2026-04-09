import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  checks.resend = process.env.RESEND_API_KEY ? "ok" : "error";

  const healthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  );
}
