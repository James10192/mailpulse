import { timingSafeEqual } from "node:crypto";

import { resolveBaileysWebhookTarget } from "@/lib/external-applications/application";
import { getBaileysInstanceName, getInboundTextMessages } from "@/lib/external-applications/baileys-inbound-message";
import { decryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import {
  RequestBodyTooLargeError,
  readBoundedRequestText,
  recordInboundTextMessages,
} from "@/lib/external-applications/meta-webhook";
import { prisma } from "@/lib/prisma";

/**
 * Evolution bridges a WhatsApp Web session, so its webhooks carry no provider
 * signature. Authentication is a per-application bearer token instead, which is
 * why the instance name alone never grants access.
 */
const INBOUND_TOKEN_PURPOSE = "INBOUND_FORWARD" as const;

export async function receiveBaileysWebhookRequest(request: Request, applicationId: string) {
  try {
    const rawBody = await readBoundedRequestText(request);
    const payload: unknown = parseJson(rawBody);
    if (!payload) return new Response("Bad request", { status: 400 });

    const instanceName = getBaileysInstanceName(payload);
    if (!instanceName) return new Response("Bad request", { status: 400 });

    const target = await resolveBaileysWebhookTarget(applicationId, instanceName);
    if (!target) return new Response("Unauthorized", { status: 401 });

    const verdict = await verifyInboundToken(target.application.id, readToken(request));
    // A key that cannot decrypt anything is a deployment fault, not a bad
    // token. Answering 401 there sends the operator rotating a secret that was
    // never the problem while every parent message is refused.
    if (verdict === "unreadable") return new Response("Service unavailable", { status: 503 });
    if (verdict === "rejected") return new Response("Unauthorized", { status: 401 });

    await recordInboundTextMessages(target.application, target.providerAccountId, getInboundTextMessages(payload));
    return new Response(null, { status: 200 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return new Response("Payload too large", { status: 413 });
    return new Response("Service unavailable", { status: 503 });
  }
}

function readToken(request: Request) {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return new URL(request.url).searchParams.get("token");
}

type InboundTokenVerdict = "accepted" | "rejected" | "unreadable";

async function verifyInboundToken(applicationId: string, token: string | null): Promise<InboundTokenVerdict> {
  if (!token) return "rejected";

  const now = new Date();
  const credentials = await prisma.externalApplicationCredential.findMany({
    where: {
      applicationId,
      purpose: INBOUND_TOKEN_PURPOSE,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { version: "desc" },
    select: { secretCiphertext: true },
  });

  // Every live credential is checked so a rotation does not reject the old
  // token before the operator has updated Evolution.
  let matched = false;
  let readable = 0;
  for (const credential of credentials) {
    try {
      const secret = decryptExternalApplicationValue(credential.secretCiphertext);
      readable += 1;
      if (equalsInConstantTime(secret, token)) matched = true;
    } catch {
      // A single undecryptable row must not deny a valid rotated token.
    }
  }

  if (matched) return "accepted";
  return credentials.length > 0 && readable === 0 ? "unreadable" : "rejected";
}

function equalsInConstantTime(expected: string, received: string) {
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
