/** Historical references remain readable, never rewritten. v3 identifies
 * an independently auditable attempt; it does NOT itself authorize resending.
 * Attempt #1 is always v2 or legacy. New attempts start at #2.
 */
const LEGACY = /^klassci-annonce-([1-9][0-9]*)-courriel-([1-9][0-9]*)$/;
const V2 = /^klassci-v2-([a-z0-9][a-z0-9_-]{1,62})-annonce-([1-9][0-9]*)-courriel-([1-9][0-9]*)$/;
const V3 = /^klassci-v3-([a-z0-9][a-z0-9_-]{1,62})-annonce-([1-9][0-9]*)-courriel-([1-9][0-9]*)-essai-([2-9]|[1-9][0-9]+)$/;

export type AnnouncementReference = {
  version: 1 | 2 | 3;
  tenant: string | null;
  announcementId: string;
  deliveryId: string;
  attemptNumber: string | null;
};

function idIsSafe(id: string): boolean {
  // For interoperability with Laravel's signed integer identifiers:
  // no leading zero, overflow or JS number loss.
  const number = Number(id);
  return Number.isSafeInteger(number) && number > 0 && String(number) === id;
}

export function parseAnnouncementReference(value: unknown): AnnouncementReference | null {
  if (typeof value !== "string" || value.length > 191) return null;
  const v3 = V3.exec(value);
  if (v3) {
    if (v3[1] === "default" || !idIsSafe(v3[2]) || !idIsSafe(v3[3]) || !idIsSafe(v3[4])) return null;
    return { version: 3, tenant: v3[1], announcementId: v3[2], deliveryId: v3[3], attemptNumber: v3[4] };
  }
  const v2 = V2.exec(value);
  if (v2) {
    if (v2[1] === "default" || !idIsSafe(v2[2]) || !idIsSafe(v2[3])) return null;
    return { version: 2, tenant: v2[1], announcementId: v2[2], deliveryId: v2[3], attemptNumber: null };
  }
  const legacy = LEGACY.exec(value);
  return legacy && idIsSafe(legacy[1]) && idIsSafe(legacy[2])
    ? { version: 1, tenant: null, announcementId: legacy[1], deliveryId: legacy[2], attemptNumber: null }
    : null;
}

export function referenceBelongsToTenant(reference: unknown, tenant: string): boolean {
  const parsed = parseAnnouncementReference(reference);
  return parsed !== null && tenant.length > 0 && tenant !== "default"
    && (parsed.tenant === null || parsed.tenant === tenant);
}
