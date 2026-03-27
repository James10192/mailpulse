import { NextRequest, NextResponse } from "next/server";
import { verifyTrackingToken } from "@/lib/tracking";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  const token = request.nextUrl.searchParams.get("t");

  if (!url) {
    return new Response("Missing URL", { status: 400 });
  }

  if (token) {
    const data = verifyTrackingToken(token);
    if (data) {
      // Fire-and-forget: log click event
      prisma.emailEvent
        .create({
          data: {
            type: "CLICKED",
            recipientId: data.recipientId,
            contactId: "", // resolved via recipient relation
            metadata: {
              url,
              ip: request.headers.get("x-forwarded-for") ?? "unknown",
              userAgent: request.headers.get("user-agent"),
              timestamp: new Date().toISOString(),
            },
          },
        })
        .catch(() => {});

      // Update recipient click timestamp
      prisma.campaignRecipient
        .update({
          where: { id: data.recipientId },
          data: { clickedAt: new Date() },
        })
        .catch(() => {});
    }
  }

  // 302 redirect to original URL
  return NextResponse.redirect(url, 302);
}
