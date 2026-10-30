import { referenceBelongsToTenant } from "./announcement-reference";
/** A read-only lookup for an ambiguous KLASSCI submission. This never
 * submits messages or treats a missing row as proof that none was sent.
 */
export type AnnouncementLookupMessage = {
  origin: string | null;
  channel: string;
  recipientType: string;
  recipientValue: string;
  idempotencyKey: string | null;
  externalTenantId: string | null;
  metadata: unknown;
};
export function isAnnouncementLookupMatch(message: AnnouncementLookupMessage, key: string, tenant: string) {
  if (message.origin !== "API" || message.channel !== "EMAIL"
    || message.recipientType !== "EMAIL" || message.externalTenantId !== tenant
    || message.idempotencyKey !== key || !referenceBelongsToTenant(key, tenant)) return false;
  const metadata = message.metadata;
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const values = metadata as Record<string, unknown>;
  return values.source === "klassci" && values.workflow_event === "announcement_email"
    && values.external_reference === key;
}
