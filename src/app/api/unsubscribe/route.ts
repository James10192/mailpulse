import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyTrackingToken } from "@/lib/tracking";

async function processUnsubscribe(token: string, method: string): Promise<boolean> {
  const data = verifyTrackingToken(token);
  if (!data) return false;

  // verifyTrackingToken returns recipientId — for unsubscribe tokens generated
  // via generateUnsubscribeUrl, this is actually the contactId
  const contactId = data.recipientId;

  await prisma.contact.update({
    where: { id: contactId },
    data: { subscribed: false },
  });

  await prisma.emailEvent.create({
    data: {
      type: "UNSUBSCRIBED",
      contactId,
      metadata: { campaignId: data.campaignId, method },
    },
  });

  return true;
}

// One-click unsubscribe (POST from email client)
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) return new Response("Missing token", { status: 400 });

  const ok = await processUnsubscribe(token, "one-click");
  if (!ok) return new Response("Invalid token", { status: 400 });

  return new Response("You have been unsubscribed.", { status: 200 });
}

// Browser unsubscribe (GET link in email)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t");
  if (!token) return new Response("Missing token", { status: 400 });

  const ok = await processUnsubscribe(token, "link");
  if (!ok) return new Response("Invalid token", { status: 400 });

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
