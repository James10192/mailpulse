import type { Prisma } from "@/generated/prisma";

import { decryptExternalApplicationValue, encryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import { postPinnedHttpsCallback } from "@/lib/external-applications/network";
import { createVersionedSignature } from "@/lib/external-applications/signatures";

export const CALLBACK_TIMEOUT_MS = 10_000;
export const MAX_CALLBACK_BODY_BYTES = 32 * 1024;

type CallbackOutboxDatabase = Pick<Prisma.TransactionClient, "applicationForwardEndpoint">;

export type ExternalCallbackDeliverySnapshot = {
  sourceEndpointId: string;
  event: string;
  payloadCiphertext: string;
  destinationUrl: string;
  keyId: string;
  secretCiphertext: string;
  nextAttemptAt: Date;
};

/**
 * Captures all matching destinations while the inbound event is recorded.
 * The copied credentials are intentionally independent from the mutable
 * endpoint configuration used for future inbound events.
 */
export async function snapshotExternalApplicationCallbackDeliveries(
  db: CallbackOutboxDatabase,
  input: {
    applicationId: string;
    providerAccountId: string;
    event: string;
    payload: string;
    now: Date;
  },
): Promise<ExternalCallbackDeliverySnapshot[]> {
  if (Buffer.byteLength(input.payload) > MAX_CALLBACK_BODY_BYTES) {
    throw new Error("External application callback payload is too large.");
  }

  const endpoints = await db.applicationForwardEndpoint.findMany({
    where: {
      applicationId: input.applicationId,
      active: true,
      events: { has: input.event },
      OR: [{ providerAccountId: null }, { providerAccountId: input.providerAccountId }],
    },
    select: { id: true, url: true, keyId: true, secretCiphertext: true },
  });

  return endpoints.map((endpoint) => ({
    sourceEndpointId: endpoint.id,
    event: input.event,
    payloadCiphertext: encryptExternalApplicationValue(input.payload),
    destinationUrl: endpoint.url,
    keyId: endpoint.keyId,
    secretCiphertext: endpoint.secretCiphertext,
    nextAttemptAt: input.now,
  }));
}

export async function postExternalApplicationCallback(input: {
  destinationUrl: string;
  keyId: string;
  secretCiphertext: string;
  event: string;
  payloadCiphertext: string;
  timeoutMs?: number;
}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload = decryptExternalApplicationValue(input.payloadCiphertext);
  const secret = decryptExternalApplicationValue(input.secretCiphertext);
  let status: number;
  try {
    status = await postPinnedHttpsCallback({
      url: input.destinationUrl,
      timeoutMs: Math.min(input.timeoutMs ?? CALLBACK_TIMEOUT_MS, CALLBACK_TIMEOUT_MS),
      headers: {
        "content-type": "application/json",
        "x-external-event": input.event,
        "x-external-timestamp": timestamp,
        "x-external-signature": createVersionedSignature(input.keyId, secret, timestamp, payload),
      },
      body: payload,
    });
  } catch {
    // A timeout or transport failure can happen after the peer accepted data.
    throw new ExternalCallbackError({ ambiguous: true, retryable: true });
  }

  if (status >= 200 && status < 300) return;
  if (status >= 300 && status < 400) {
    throw new ExternalCallbackError({ ambiguous: false, retryable: false });
  }
  throw new ExternalCallbackError({
    ambiguous: false,
    retryable: status === 408 || status === 425 || status === 429 || status >= 500,
  });
}

export class ExternalCallbackError extends Error {
  readonly ambiguous: boolean;
  readonly retryable: boolean;

  constructor(input: { ambiguous: boolean; retryable: boolean }) {
    super("External application callback failed.");
    this.ambiguous = input.ambiguous;
    this.retryable = input.retryable;
  }
}
