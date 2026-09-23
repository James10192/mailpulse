/**
 * Organization-scoped lookups and mutations on contacts, tags and segments.
 *
 * Every function takes the caller's organization id and folds it into the
 * query itself, so a record owned by another organization behaves exactly like
 * a record that does not exist: same result, no way to tell them apart.
 *
 * The database is injected as a narrow structural type so the scoping can be
 * exercised in tests without a Prisma client.
 */

export const CONTACT_TAG_NAME_MAX_LENGTH = 100;

type OrgScopedId = { id: string; organizationId: string };

type ContactTagWhere = {
  id?: string;
  name?: string;
  contactId?: string;
  contact?: { organizationId: string };
};

export type TenantScopedDb = {
  contact: {
    findFirst(args: { where: OrgScopedId; select: { id: true } }): Promise<{ id: string } | null>;
  };
  contactTag: {
    findFirst(args: { where: ContactTagWhere; select: { id: true } }): Promise<{ id: string } | null>;
    create(args: { data: { name: string; contactId: string } }): Promise<unknown>;
    deleteMany(args: { where: ContactTagWhere }): Promise<{ count: number }>;
  };
  contactList: {
    deleteMany(args: { where: OrgScopedId }): Promise<{ count: number }>;
  };
};

export type ScopedResult = { ok: true } | { ok: false; reason: "not_found" | "invalid" | "duplicate" };

export function normalizeContactTagName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > CONTACT_TAG_NAME_MAX_LENGTH) return null;
  return name;
}

export async function contactBelongsToOrganization(
  db: TenantScopedDb,
  organizationId: string,
  contactId: string
): Promise<boolean> {
  if (!contactId) return false;
  const contact = await db.contact.findFirst({
    where: { id: contactId, organizationId },
    select: { id: true },
  });
  return contact !== null;
}

/**
 * Adds a tag to a contact of the organization. Prisma errors propagate.
 *
 * `contact_tag` has no unique index on (contactId, name), so duplicates are
 * detected by the read below. Run it inside a serializable transaction so two
 * concurrent calls cannot both pass the check.
 */
export async function addTagToOrganizationContact(
  db: TenantScopedDb,
  organizationId: string,
  contactId: string,
  rawName: unknown
): Promise<ScopedResult> {
  const name = normalizeContactTagName(rawName);
  if (!name) return { ok: false, reason: "invalid" };

  if (!(await contactBelongsToOrganization(db, organizationId, contactId))) {
    return { ok: false, reason: "not_found" };
  }

  const existing = await db.contactTag.findFirst({
    where: { contactId, name },
    select: { id: true },
  });
  if (existing) return { ok: false, reason: "duplicate" };

  await db.contactTag.create({ data: { name, contactId } });
  return { ok: true };
}

/** Removes one tag, only if it sits on the given contact of the organization. */
export async function removeTagFromOrganizationContact(
  db: TenantScopedDb,
  organizationId: string,
  contactId: string,
  tagId: string
): Promise<ScopedResult> {
  if (!contactId || !tagId) return { ok: false, reason: "not_found" };
  const { count } = await db.contactTag.deleteMany({
    where: { id: tagId, contactId, contact: { organizationId } },
  });
  return count > 0 ? { ok: true } : { ok: false, reason: "not_found" };
}

/** Deletes a tag name from every contact of the organization, and only there. */
export async function deleteOrganizationTag(
  db: TenantScopedDb,
  organizationId: string,
  rawName: unknown
): Promise<ScopedResult> {
  if (typeof rawName !== "string" || rawName.length === 0) return { ok: false, reason: "not_found" };
  const { count } = await db.contactTag.deleteMany({
    where: { name: rawName, contact: { organizationId } },
  });
  return count > 0 ? { ok: true } : { ok: false, reason: "not_found" };
}

export async function deleteOrganizationSegment(
  db: TenantScopedDb,
  organizationId: string,
  segmentId: string
): Promise<ScopedResult> {
  if (!segmentId) return { ok: false, reason: "not_found" };
  const { count } = await db.contactList.deleteMany({
    where: { id: segmentId, organizationId },
  });
  return count > 0 ? { ok: true } : { ok: false, reason: "not_found" };
}
