import type { ExternalApplicationContext, ExternalWhatsAppProvider } from "@/lib/external-applications/application";
import { submitCommandToProvider, type CommandSubmission } from "@/lib/external-applications/command-submission";
import { abandonPendingConsent } from "@/lib/external-applications/consent-settlement";
import { decryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import { prisma } from "@/lib/prisma";

export const CONSENT_REQUEST_OPERATION_KEY = "whatsapp.consent_request";
export const CONSENT_REQUEST_FAILED_CODE = "consent_request_failed";

/**
 * Past this many attempts whose outcome we could not read, the request is
 * abandoned: retrying forever would risk writing the same question again and
 * again to a recipient who did receive it.
 */
const MAX_REQUEST_ATTEMPTS = 3;

export type PendingConsentRequest = {
  id: string;
  recipientCiphertext: string;
  requestTextCiphertext: string | null;
  requestTtlSeconds: number | null;
  requestAttempts: number;
};

export type ConsentRequestOutcome =
  | { outcome: "sent"; sentAt: Date }
  | { outcome: "abandoned"; rejectionCode: string; operationIds: string[] }
  | { outcome: "retry" }
  | { outcome: "skipped" };

/** Sends the question itself. Its expiry clock starts here, not at the command. */
export async function sendConsentRequest(
  application: ExternalApplicationContext,
  provider: ExternalWhatsAppProvider,
  consent: PendingConsentRequest,
  now: Date,
): Promise<ConsentRequestOutcome> {
  const claimed = await prisma.externalRecipientConsent.updateMany({
    where: { id: consent.id, status: "PENDING", requestSentAt: null, requestAttempts: consent.requestAttempts },
    data: { requestAttempts: { increment: 1 } },
  });
  if (claimed.count !== 1 || !consent.requestTextCiphertext) return { outcome: "skipped" };

  const submission = await submitRequest(application, provider, consent);
  if (submission.outcome === "accepted") {
    const ttlMs = (consent.requestTtlSeconds ?? 0) * 1000;
    await prisma.externalRecipientConsent.updateMany({
      where: { id: consent.id, status: "PENDING", requestSentAt: null },
      data: { requestSentAt: now, expiresAt: new Date(now.getTime() + ttlMs), requestProviderMessageId: submission.messageId },
    });
    return { outcome: "sent", sentAt: now };
  }
  if (submission.outcome === "unknown" && consent.requestAttempts + 1 < MAX_REQUEST_ATTEMPTS) return { outcome: "retry" };

  const rejectionCode = submission.outcome === "rejected" ? submission.rejectionCode : CONSENT_REQUEST_FAILED_CODE;
  const operationIds = await prisma.$transaction((tx) => abandonPendingConsent(tx, consent.id, rejectionCode, now, { requestSentAt: null }));
  return operationIds ? { outcome: "abandoned", rejectionCode, operationIds } : { outcome: "skipped" };
}

async function submitRequest(application: ExternalApplicationContext, provider: ExternalWhatsAppProvider, consent: PendingConsentRequest): Promise<CommandSubmission> {
  try {
    const text = decryptExternalApplicationValue(consent.requestTextCiphertext!);
    const recipient = decryptExternalApplicationValue(consent.recipientCiphertext);
    return await submitCommandToProvider(application, provider, {
      operationKey: CONSENT_REQUEST_OPERATION_KEY,
      idempotencyKey: consent.id,
      recipient,
      content: { type: "text", text },
    }, consent.id);
  } catch {
    return { outcome: "unknown" };
  }
}
