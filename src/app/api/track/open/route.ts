import { NextRequest } from "next/server";
import { verifyTrackingToken } from "@/lib/tracking";
import { prisma } from "@/lib/prisma";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");

  if (token) {
    const data = verifyTrackingToken(token);
    if (data) {
      // Fire-and-forget: don't block pixel response
      prisma.emailEvent
        .create({
          data: {
            type: "OPENED",
            recipientId: data.recipientId,
            contactId: "", // resolved below
            metadata: {
              ip: request.headers.get("x-forwarded-for") ?? "unknown",
              userAgent: request.headers.get("user-agent"),
              timestamp: new Date().toISOString(),
            },
          },
        })
        .catch(() => {});

      // Update recipient open timestamp
      prisma.campaignRecipient
        .update({
          where: { id: data.recipientId },
          data: { openedAt: new Date() },
        })
        .catch(() => {});
    }
  }

  return new Response(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
