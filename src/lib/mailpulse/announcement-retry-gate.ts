import { parseAnnouncementReference } from "./announcement-reference";

/**
 * An attempt-v3 reference is not an authorization to replay a delivered
 * message. The preceding attempt must have FAILED before reaching Resend.
 * A provider event, unknown outcome or suppression is never eligible.
 */
export type RetryEvidence = {
  origin: string | null;
  channel: string;
  recipientType: string;
  recipientValue: string;
  externalTenantId: string | null;
  idempotencyKey: string | null;
  status: string;
  errorCode: string | null;
  providerMessageId: string | null;
  metadata: unknown;
};

const SAFE_PRE_DISPATCH_ERRORS = new Set([
  "template_not_configured",
  "channel_not_configured",
]);

export function precedingAnnouncementReference(key: string): string | null {
  const p = parseAnnouncementReference(key);
  if (!p || p.version !== 3 || p.tenant === null || p.attemptNumber === null) return null;
  const previous = Number(p.attemptNumber) - 1;
  if (previous === 1) {
    return `klassci-v2-${p.tenant}-annonce-${p.announcementId}-courriel-${p.deliveryId}`;
  }
  return `klassci-v3-${p.tenant}-annonce-${p.announcementId}-courriel-${p.deliveryId}-essai-${previous}`;
}

export function priorAttemptPermitsRetry(
  original: RetryEvidence | null,
  previousKey: string,
  targetKey: string,
  tenant: string,
  recipient: string,
  isSuppressed: boolean,
): boolean {
  const expectedPrevious = precedingAnnouncementReference(targetKey);
  if (!expectedPrevious || expectedPrevious !== previousKey || !original || isSuppressed) return false;

  const p = parseAnnouncementReference(targetKey);
  if (!p || p.version !== 3 || p.tenant !== tenant) return false;

  const meta = original.metadata;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  const data = meta as Record<string, unknown>;
  return original.origin === "API"
    && original.channel === "EMAIL"
    && original.recipientType === "EMAIL"
    && original.recipientValue === recipient
    && original.externalTenantId === tenant
    && original.idempotencyKey === previousKey
    && original.status === "FAILED"
    && original.providerMessageId === null
    && SAFE_PRE_DISPATCH_ERRORS.has(original.errorCode ?? "")
    && data.source === "klassci"
    && data.workflow_event === "announcement_email"
    && data.external_reference === previousKey;
}
