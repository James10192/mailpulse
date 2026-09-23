import assert from "node:assert/strict";
import test from "node:test";
import { resolveScheduleTargets, type CampaignScopedDb } from "./tenant-scope";
import { parseCampaignAudience } from "./audience";

const matches = (row: { id: string; organizationId: string }, where: { id?: string; organizationId?: string }) =>
  (where.id === undefined || row.id === where.id) &&
  (where.organizationId === undefined || row.organizationId === where.organizationId);

/** In-memory stand-in applying exactly the `where` filters the helper sends, like Prisma. */
function createDb(): CampaignScopedDb {
  const senders = [
    { id: "sender-a", organizationId: "org-a", name: "Équipe A", email: "a@example.com", replyTo: null },
    { id: "sender-b", organizationId: "org-b", name: "Équipe B", email: "b@example.com", replyTo: "r@example.com" },
  ];
  const lists = [
    { id: "list-a", organizationId: "org-a" },
    { id: "list-b", organizationId: "org-b" },
  ];
  return {
    emailSender: {
      async findFirst({ where }) {
        const found = senders.find((s) => matches(s, where));
        return found ? { name: found.name, email: found.email, replyTo: found.replyTo } : null;
      },
    },
    contactList: {
      async findFirst({ where }) {
        const found = lists.find((l) => matches(l, where));
        return found ? { id: found.id } : null;
      },
    },
  };
}

test("an email campaign is scheduled with the organization's own sender and list", async () => {
  const targets = await resolveScheduleTargets(createDb(), "org-a", {
    channel: "EMAIL",
    senderId: "sender-a",
    audience: "list:list-a",
  });
  assert.deepEqual(targets, {
    ok: true,
    sender: { name: "Équipe A", email: "a@example.com", replyTo: null },
    contactListId: "list-a",
  });
});

test("another organization's sender is refused like an unknown one", async () => {
  const db = createDb();
  const foreign = await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "sender-b", audience: "all" });
  const unknown = await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "sender-zzz", audience: "all" });
  assert.deepEqual(foreign, { ok: false, reason: "sender_not_found" });
  assert.deepEqual(unknown, foreign);
});

test("another organization's list is refused like an unknown one", async () => {
  const db = createDb();
  const foreign = await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "sender-a", audience: "list:list-b" });
  const unknown = await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "sender-a", audience: "list:list-zzz" });
  assert.deepEqual(foreign, { ok: false, reason: "list_not_found" });
  assert.deepEqual(unknown, foreign);
});

test("a WhatsApp campaign needs no sender but its list is still checked", async () => {
  const db = createDb();
  assert.deepEqual(
    await resolveScheduleTargets(db, "org-a", { channel: "WHATSAPP", senderId: "", audience: "all" }),
    { ok: true, sender: null, contactListId: null }
  );
  assert.deepEqual(
    await resolveScheduleTargets(db, "org-a", { channel: "WHATSAPP", senderId: "", audience: "list:list-b" }),
    { ok: false, reason: "list_not_found" }
  );
});

test("tag and malformed audiences cannot be scheduled", async () => {
  const db = createDb();
  assert.deepEqual(
    await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "sender-a", audience: "tag:vip" }),
    { ok: false, reason: "unsupported_audience" }
  );
  assert.deepEqual(
    await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "sender-a", audience: "list-a" }),
    { ok: false, reason: "invalid_audience" }
  );
});

test("parses the audience string of the campaign form", () => {
  assert.deepEqual(parseCampaignAudience("all"), { kind: "all" });
  assert.deepEqual(parseCampaignAudience("list:abc"), { kind: "list", id: "abc" });
  assert.deepEqual(parseCampaignAudience("tag: vip "), { kind: "tag", name: "vip" });
  assert.ok("error" in parseCampaignAudience("list:"));
  assert.ok("error" in parseCampaignAudience("tag:" + "a".repeat(101)));
});
