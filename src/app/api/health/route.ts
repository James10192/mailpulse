import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  // Check Prisma/Neon
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "error";
  }

  // Check Resend
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    });
    checks.resend = res.ok ? "ok" : "error";
  } catch {
    checks.resend = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  );
}
