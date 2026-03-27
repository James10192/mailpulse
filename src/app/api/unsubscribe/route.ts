import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac } from "crypto";

const TRACKING_SECRET = process.env.TRACKING_SECRET ?? "mailpulse-tracking-secret";

function verifyUnsubscribeToken(token: string) {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;

    const [contactId, campaignId, providedHmac] = parts;
    const payload = `${contactId}:${campaignId}`;
    const expectedHmac = createHmac("sha256", TRACKING_SECRET)
      .update(payload)
      .digest("hex")
      .slice(0, 16);

    if (providedHmac !== expectedHmac) return null;
    return { contactId, campaignId };
  } catch {
    return null;
  }
}

// One-click unsubscribe (POST from email client)
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) return new Response("Missing token", { status: 400 });

  const data = verifyUnsubscribeToken(token);
  if (!data) return new Response("Invalid token", { status: 400 });

  await prisma.contact.update({
    where: { id: data.contactId },
    data: { subscribed: false },
  });

  await prisma.emailEvent.create({
    data: {
      type: "UNSUBSCRIBED",
      contactId: data.contactId,
      metadata: { campaignId: data.campaignId, method: "one-click" },
    },
  });

  return new Response("You have been unsubscribed.", { status: 200 });
}

// Browser unsubscribe (GET link in email)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) return new Response("Missing token", { status: 400 });

  const data = verifyUnsubscribeToken(token);
  if (!data) return new Response("Invalid token", { status: 400 });

  await prisma.contact.update({
    where: { id: data.contactId },
    data: { subscribed: false },
  });

  await prisma.emailEvent.create({
    data: {
      type: "UNSUBSCRIBED",
      contactId: data.contactId,
      metadata: { campaignId: data.campaignId, method: "link" },
    },
  });

  // Render a simple confirmation page
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Unsubscribed</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#09090b;color:#fafafa}
.card{text-align:center;padding:3rem;border-radius:1rem;border:1px solid #27272a;max-width:400px}
h1{font-size:1.5rem;margin-bottom:1rem}p{color:#a1a1aa;line-height:1.6}</style>
</head>
<body><div class="card"><h1>Successfully Unsubscribed</h1><p>You will no longer receive emails from this sender. This change takes effect immediately.</p></div></body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html" },
  });
}
