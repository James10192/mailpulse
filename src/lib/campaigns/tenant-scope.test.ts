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
  return {
    emailSender: {
      async findFirst({ where }) {
        const found = senders.find((s) => matches(s, where));
        return found ? { name: found.name, email: found.email, replyTo: found.replyTo } : null;
      },
    },
  };
}

test("an email campaign is scheduled to everyone with the organization's own sender", async () => {
  const targets = await resolveScheduleTargets(createDb(), "org-a", {
    channel: "EMAIL",
    senderId: "sender-a",
    audience: "all",
  });
  assert.deepEqual(targets, { ok: true, sender: { name: "Équipe A", email: "a@example.com", replyTo: null } });
});

test("another organization's sender is refused like an unknown one", async () => {
  const db = createDb();
  const foreign = await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "sender-b", audience: "all" });
  const unknown = await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "sender-zzz", audience: "all" });
  const missing = await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "", audience: "all" });
  assert.deepEqual(foreign, { ok: false, reason: "sender_not_found" });
  assert.deepEqual(unknown, foreign);
  assert.deepEqual(missing, foreign);
});

test("a WhatsApp campaign needs no sender", async () => {
  assert.deepEqual(
    await resolveScheduleTargets(createDb(), "org-a", { channel: "WHATSAPP", senderId: "", audience: "all" }),
    { ok: true, sender: null }
  );
});

test("segment and tag audiences cannot be scheduled", async () => {
  const db = createDb();
  for (const audience of ["list:list-a", "tag:vip"]) {
    assert.deepEqual(
      await resolveScheduleTargets(db, "org-a", { channel: "EMAIL", senderId: "sender-a", audience }),
      { ok: false, reason: "unsupported_audience" }
    );
  }
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
