import assert from "node:assert/strict";
import test from "node:test";
import {
  CONTACT_TAG_NAME_MAX_LENGTH,
  addTagToOrganizationContact,
  contactBelongsToOrganization,
  deleteOrganizationSegment,
  deleteOrganizationTag,
  removeTagFromOrganizationContact,
  type TenantScopedDb,
} from "./tenant-scope";

type Contact = { id: string; organizationId: string };
type Tag = { id: string; name: string; contactId: string };
type Segment = { id: string; organizationId: string };

const matchesOrgRow = (row: { id: string; organizationId: string }, where: { id?: string; organizationId?: string }) =>
  (where.id === undefined || row.id === where.id) &&
  (where.organizationId === undefined || row.organizationId === where.organizationId);

/**
 * In-memory stand-in that applies the `where` filters the helpers send, the way
 * Prisma would. A filter the code forgets to send is a filter that does not apply.
 */
function createDb() {
  const contacts: Contact[] = [
    { id: "contact-a", organizationId: "org-a" },
    { id: "contact-b", organizationId: "org-b" },
  ];
  const tags: Tag[] = [
    { id: "tag-a", name: "vip", contactId: "contact-a" },
    { id: "tag-b", name: "vip", contactId: "contact-b" },
  ];
  const segments: Segment[] = [
    { id: "segment-a", organizationId: "org-a" },
    { id: "segment-b", organizationId: "org-b" },
  ];
  let nextTagId = 1;

  const orgOfContact = (contactId: string) => contacts.find((c) => c.id === contactId)?.organizationId;

  const tagMatches = (tag: Tag, where: Parameters<TenantScopedDb["contactTag"]["deleteMany"]>[0]["where"]) =>
    (where.id === undefined || tag.id === where.id) &&
    (where.name === undefined || tag.name === where.name) &&
    (where.contactId === undefined || tag.contactId === where.contactId) &&
    (where.contact === undefined || orgOfContact(tag.contactId) === where.contact.organizationId);

  const db: TenantScopedDb = {
    contact: {
      async findFirst({ where }) {
        const found = contacts.find((c) => matchesOrgRow(c, where));
        return found ? { id: found.id } : null;
      },
    },
    contactTag: {
      async findFirst({ where }) {
        const found = tags.find((t) => tagMatches(t, where));
        return found ? { id: found.id } : null;
      },
      async create({ data }) {
        const tag = { id: `new-tag-${nextTagId++}`, ...data };
        tags.push(tag);
        return tag;
      },
      async deleteMany({ where }) {
        const before = tags.length;
        for (let i = tags.length - 1; i >= 0; i--) {
          if (tagMatches(tags[i], where)) tags.splice(i, 1);
        }
        return { count: before - tags.length };
      },
    },
    contactList: {
      async deleteMany({ where }) {
        const before = segments.length;
        for (let i = segments.length - 1; i >= 0; i--) {
          if (matchesOrgRow(segments[i], where)) segments.splice(i, 1);
        }
        return { count: before - segments.length };
      },
    },
  };

  return { db, tags, segments };
}

test("a contact belongs only to its own organization", async () => {
  const { db } = createDb();
  assert.equal(await contactBelongsToOrganization(db, "org-a", "contact-a"), true);
  assert.equal(await contactBelongsToOrganization(db, "org-a", "contact-b"), false);
  assert.equal(await contactBelongsToOrganization(db, "org-a", ""), false);
});

test("adds a tag to a contact of the caller's organization", async () => {
  const { db, tags } = createDb();
  const result = await addTagToOrganizationContact(db, "org-a", "contact-a", "  client   fidèle ");
  assert.deepEqual(result, { ok: true });
  assert.ok(tags.some((t) => t.contactId === "contact-a" && t.name === "client fidèle"));
});

test("refuses to tag another organization's contact, exactly like an unknown contact", async () => {
  const { db, tags } = createDb();
  const foreign = await addTagToOrganizationContact(db, "org-a", "contact-b", "intrus");
  const unknown = await addTagToOrganizationContact(db, "org-a", "contact-zzz", "intrus");
  assert.deepEqual(foreign, { ok: false, reason: "not_found" });
  assert.deepEqual(unknown, foreign);
  assert.equal(tags.some((t) => t.name === "intrus"), false);
});

test("reports a duplicate tag on the same contact without creating it twice", async () => {
  const { db, tags } = createDb();
  const result = await addTagToOrganizationContact(db, "org-a", "contact-a", "vip");
  assert.deepEqual(result, { ok: false, reason: "duplicate" });
  assert.equal(tags.filter((t) => t.contactId === "contact-a" && t.name === "vip").length, 1);
});

test("refuses an empty, non-string or oversized tag name", async () => {
  const { db } = createDb();
  for (const name of ["   ", 42, null, "a".repeat(CONTACT_TAG_NAME_MAX_LENGTH + 1)]) {
    assert.deepEqual(await addTagToOrganizationContact(db, "org-a", "contact-a", name), { ok: false, reason: "invalid" });
  }
  assert.deepEqual(
    await addTagToOrganizationContact(db, "org-a", "contact-a", "a".repeat(CONTACT_TAG_NAME_MAX_LENGTH)),
    { ok: true }
  );
});

test("removes a tag from a contact of the caller's organization", async () => {
  const { db, tags } = createDb();
  assert.deepEqual(await removeTagFromOrganizationContact(db, "org-a", "contact-a", "tag-a"), { ok: true });
  assert.equal(tags.some((t) => t.id === "tag-a"), false);
});

test("cannot remove another organization's tag, whatever contact id is claimed", async () => {
  const { db, tags } = createDb();
  const viaForeignContact = await removeTagFromOrganizationContact(db, "org-a", "contact-b", "tag-b");
  const viaOwnContact = await removeTagFromOrganizationContact(db, "org-a", "contact-a", "tag-b");
  const unknown = await removeTagFromOrganizationContact(db, "org-a", "contact-a", "tag-zzz");
  assert.deepEqual(viaForeignContact, { ok: false, reason: "not_found" });
  assert.deepEqual(viaOwnContact, viaForeignContact);
  assert.deepEqual(unknown, viaForeignContact);
  assert.ok(tags.some((t) => t.id === "tag-b"));
});

test("deleting a tag name only touches the caller's organization", async () => {
  const { db, tags } = createDb();
  assert.deepEqual(await deleteOrganizationTag(db, "org-a", "vip"), { ok: true });
  assert.equal(tags.some((t) => t.id === "tag-a"), false);
  assert.ok(tags.some((t) => t.id === "tag-b"), "the other organization keeps its tag");
});

test("deleting a tag the organization does not have reports not found", async () => {
  const { db, tags } = createDb();
  assert.deepEqual(await deleteOrganizationTag(db, "org-c", "vip"), { ok: false, reason: "not_found" });
  assert.deepEqual(await deleteOrganizationTag(db, "org-a", ""), { ok: false, reason: "not_found" });
  assert.equal(tags.length, 2);
});

test("cannot delete another organization's segment, exactly like an unknown one", async () => {
  const { db, segments } = createDb();
  const foreign = await deleteOrganizationSegment(db, "org-a", "segment-b");
  const unknown = await deleteOrganizationSegment(db, "org-a", "segment-zzz");
  assert.deepEqual(foreign, { ok: false, reason: "not_found" });
  assert.deepEqual(unknown, foreign);
  assert.ok(segments.some((s) => s.id === "segment-b"));

  assert.deepEqual(await deleteOrganizationSegment(db, "org-a", "segment-a"), { ok: true });
  assert.equal(segments.some((s) => s.id === "segment-a"), false);
});
