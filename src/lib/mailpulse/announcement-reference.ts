/** Legacy keys remain readable; new keys identify the school to avoid
 * idempotency collisions within a shared MailPulse organization.
 */
const LEGACY = /^klassci-annonce-([1-9][0-9]*)-courriel-([1-9][0-9]*)$/;
const V3 = /^klassci-v3-([a-z0-9][a-z0-9_-]{1,62})-annonce-([1-9][0-9]*)-courriel-([1-9][0-9]*)-essai-([1-9][0-9]*)$/;
const V2 = /^klassci-v2-([a-z0-9][a-z0-9_-]{1,62})-annonce-([1-9][0-9]*)-courriel-([1-9][0-9]*)$/;

export type AnnouncementReference = {
  version: 1 | 2 | 3;
  attemptNumber?: string;
  tenant: string | null;
  announcementId: string;
  deliveryId: string;
};

export function parseAnnouncementReference(value: unknown): AnnouncementReference | null {
  if (typeof value !== "string" || value.length > 191) return null;
  const v3 = V3.exec(value);
  if (v3) {
    if (v3[1] === "default" || [v3[2],v3[3],v3[4]].some(v => String(BigInt(v)) !== v)) return null;
    return { version: 3, tenant: v3[1], announcementId: v3[2], deliveryId: v3[3], attemptNumber: v3[4] };
  }
  const v2 = V2.exec(value);
  if (v2) {
    if (v2[1] === "default") return null;
    return { version: 2, tenant: v2[1], announcementId: v2[2], deliveryId: v2[3] };
  }
  const legacy = LEGACY.exec(value);
  return legacy
    ? { version: 1, tenant: null, announcementId: legacy[1], deliveryId: legacy[2] }
    : null;
}

export function referenceBelongsToTenant(reference: unknown, tenant: string): boolean {
  const parsed = parseAnnouncementReference(reference);
  return parsed !== null && tenant.length > 0 && tenant !== "default"
    && (parsed.tenant === null || parsed.tenant === tenant);
}
