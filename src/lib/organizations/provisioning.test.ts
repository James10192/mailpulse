import assert from "node:assert/strict";
import test from "node:test";
import { ensureUserOrganization, type OrganizationProvisioningDb } from "./provisioning";

type Org = { id: string; slug: string };
const uniqueViolation = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

/** In-memory organizations with a unique slug, like the real table. */
function createDb(options: { takenSlugs?: string[] } = {}) {
  const orgs: Org[] = (options.takenSlugs ?? []).map((slug, i) => ({ id: `foreign-${i}`, slug }));
  const members: { userId: string; orgId: string; role: string }[] = [];
  let creates = 0;

  const db: OrganizationProvisioningDb<Org> = {
    async findMembership(userId) {
      const member = members.find((m) => m.userId === userId);
      const org = member && orgs.find((o) => o.id === member.orgId);
      return member && org ? { org, role: member.role } : null;
    },
    async createOrganizationWithOwner({ userId, slug }) {
      creates++;
      if (orgs.some((o) => o.slug === slug)) throw uniqueViolation();
      const org = { id: `org-${creates}`, slug };
      orgs.push(org);
      members.push({ userId, orgId: org.id, role: "owner" });
      return org;
    },
  };
  return { db, orgs, members, addMember: (userId: string, org: Org) => { orgs.push(org); members.push({ userId, orgId: org.id, role: "owner" }); } };
}

test("a new user gets an organization and is its owner", async () => {
  const { db, members } = createDb();
  const result = await ensureUserOrganization(db, { id: "user12345678", name: "Awa" });
  assert.equal(result.created, true);
  assert.equal(result.role, "owner");
  assert.equal(result.org.slug, "org-user1234");
  assert.equal(members.length, 1);
});

test("an existing membership is returned without creating anything", async () => {
  const state = createDb();
  state.addMember("user12345678", { id: "existing", slug: "org-existing" });
  const result = await ensureUserOrganization(state.db, { id: "user12345678", name: null });
  assert.deepEqual(result, { org: { id: "existing", slug: "org-existing" }, role: "owner", created: false });
});

test("losing a creation race returns the winner's organization instead of failing", async () => {
  const state = createDb();
  let raced = false;
  const db: OrganizationProvisioningDb<Org> = {
    findMembership: state.db.findMembership,
    async createOrganizationWithOwner(input) {
      if (!raced) {
        raced = true;
        // A concurrent request of the same user commits first.
        state.addMember(input.userId, { id: "winner", slug: input.slug });
        throw uniqueViolation();
      }
      return state.db.createOrganizationWithOwner(input);
    },
  };
  const result = await ensureUserOrganization(db, { id: "user12345678", name: "Awa" });
  assert.deepEqual(result, { org: { id: "winner", slug: "org-user1234" }, role: "owner", created: false });
});

test("a slug taken by someone else falls back to the full-id slug", async () => {
  const { db } = createDb({ takenSlugs: ["org-user1234"] });
  const result = await ensureUserOrganization(db, { id: "user12345678", name: "Awa" });
  assert.equal(result.org.slug, "org-user12345678");
  assert.equal(result.created, true);
});

test("any other database error propagates", async () => {
  const db: OrganizationProvisioningDb<Org> = {
    findMembership: async () => null,
    createOrganizationWithOwner: async () => {
      throw Object.assign(new Error("connection lost"), { code: "P1001" });
    },
  };
  await assert.rejects(ensureUserOrganization(db, { id: "user12345678", name: null }), { code: "P1001" });
});
