// Runs the overview's real queries against a database (DATABASE_URL, as in CI). Skipped without one.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";

const hasDatabase = Boolean(process.env.DATABASE_URL);

const { prisma } = await import("@/lib/prisma");
const { loadPlatformOverview } = await import("./overview");
const { ORGANIZATION_SENDER } = await import("./overview-metrics");

const run = randomUUID().slice(0, 8);
const organizationId = `org-overview-${run}`;
const otherOrganizationId = `org-overview-other-${run}`;
const now = new Date("2026-10-01T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
const accounts = { abidjan: "", yakro: "" };

type MessageSeed = { channel?: "EMAIL" | "WHATSAPP" | "SMS"; status: string; errorCode?: string; senderAccountId?: string | null; origin?: "API" | "PLATFORM" | "CAMPAIGN" | null; at: Date; organization?: string };

let sequence = 0;
async function message(seed: MessageSeed, count = 1) {
  for (let index = 0; index < count; index += 1) {
    sequence += 1;
    await prisma.communicationMessage.create({
      data: {
        organizationId: seed.organization ?? organizationId,
        channel: seed.channel ?? "WHATSAPP",
        origin: seed.origin === undefined ? "API" : seed.origin,
        recipientType: seed.channel === "EMAIL" ? "EMAIL" : "PHONE",
        recipientValue: seed.channel === "EMAIL" ? `parent${sequence}@example.ci` : `+22507000${String(sequence).padStart(5, "0")}`,
        contentType: "TEXT",
        text: "Bonjour",
        status: seed.status as never,
        errorCode: seed.errorCode ?? null,
        senderAccountId: seed.senderAccountId ?? null,
        createdAt: seed.at,
      },
    });
  }
}

async function operation(seed: { accountId: string; applicationId: string; status: string; rejectionCode?: string; at: Date }, count = 1) {
  for (let index = 0; index < count; index += 1) {
    sequence += 1;
    await prisma.externalTransportOperation.create({
      data: {
        organizationId,
        applicationId: seed.applicationId,
        providerAccountId: seed.accountId,
        direction: "OUTBOUND",
        operationKey: "send_message",
        idempotencyKey: `op-${run}-${sequence}`,
        status: seed.status,
        rejectionCode: seed.rejectionCode ?? null,
        createdAt: seed.at,
      },
    });
  }
}

const applications = { abidjan: "", yakro: "" };

before(async () => {
  if (!hasDatabase) return;
  await prisma.organization.createMany({
    data: [
      { id: organizationId, name: "École", slug: `ecole-${run}`, whatsappEnabled: true, whatsappMode: "BAILEYS", evoInstanceName: `mp-${run}`, evoInstanceStatus: "open", smsEnabled: false },
      { id: otherOrganizationId, name: "Autre", slug: `autre-${run}` },
    ],
  });
  for (const school of ["abidjan", "yakro"] as const) {
    const application = await prisma.externalApplication.create({ data: { organizationId, key: `app-${school}`, name: `Application ${school}` } });
    const account = await prisma.providerAccount.create({
      data: { organizationId, applicationId: application.id, channel: "WHATSAPP", provider: "BAILEYS_WHATSAPP", externalAccountId: `mp-${school}-${run}`, senderId: "2250700009999", label: null, active: school === "abidjan" },
    });
    applications[school] = application.id;
    accounts[school] = account.id;
  }

  // Current week: the organization's number delivers, Abidjan's number fails half the time.
  await message({ status: "DELIVERED", at: hoursAgo(2) }, 10);
  await message({ status: "DELIVERED", senderAccountId: accounts.abidjan, at: hoursAgo(3) }, 5);
  await message({ status: "FAILED", errorCode: "provider_rejected", senderAccountId: accounts.abidjan, at: hoursAgo(3) }, 5);
  await message({ channel: "EMAIL", status: "SENT", at: hoursAgo(4) }, 4);
  await message({ status: "TEMPLATE_REQUIRED", at: hoursAgo(5) }, 3);
  await message({ status: "QUEUED", at: hoursAgo(1) }, 2);
  // Signed commands from Yakro's application, on a number since disabled.
  await operation({ accountId: accounts.yakro, applicationId: applications.yakro, status: "ACCEPTED", at: hoursAgo(6) }, 3);
  await operation({ accountId: accounts.yakro, applicationId: applications.yakro, status: "REJECTED", rejectionCode: "provider_error", at: hoursAgo(6) }, 2);

  // Never counted: a campaign, another organization, and a message from before both periods.
  await message({ status: "FAILED", errorCode: "email_bounced", origin: "CAMPAIGN", at: hoursAgo(2) }, 7);
  await message({ status: "FAILED", errorCode: "email_bounced", organization: otherOrganizationId, at: hoursAgo(2) }, 7);
  await message({ status: "DELIVERED", at: hoursAgo(24 * 30) }, 9);

  // The week before: more volume, fewer failures.
  await message({ status: "DELIVERED", at: hoursAgo(24 * 7 + 5) }, 80);
  await message({ status: "FAILED", errorCode: "provider_rejected", at: hoursAgo(24 * 7 + 5) }, 1);
});

after(async () => {
  if (!hasDatabase) return;
  for (const id of [organizationId, otherOrganizationId]) {
    await prisma.communicationMessage.deleteMany({ where: { organizationId: id } });
    await prisma.externalTransportOperation.deleteMany({ where: { organizationId: id } });
    await prisma.providerAccount.deleteMany({ where: { organizationId: id } });
    await prisma.externalApplication.deleteMany({ where: { organizationId: id } });
    await prisma.organization.delete({ where: { id } });
  }
  await prisma.$disconnect();
});

test("both rails are counted, campaigns and other organizations never", { skip: !hasDatabase }, async () => {
  const overview = await loadPlatformOverview(organizationId, "7d", now);
  // 10 + 5 + 5 + 4 + 3 + 2 messages, 3 + 2 operations.
  assert.deepEqual(overview.totals.current, { delivered: 15, sent: 7, pending: 2, failed: 10, closed: 0 });
  assert.equal(overview.volume.current, 34);
  assert.equal(overview.volume.previous, 81);
  assert.equal(overview.failed.previous, 1);
});

test("failure reasons merge both rails by meaning", { skip: !hasDatabase }, async () => {
  const overview = await loadPlatformOverview(organizationId, "7d", now);
  assert.deepEqual(
    overview.failures.map((failure) => [failure.label, failure.count]),
    [["Refus du fournisseur", 7], ["Modèle requis hors fenêtre de 24 h", 3]],
  );
});

test("each number has its own health, the organization's included", { skip: !hasDatabase }, async () => {
  const overview = await loadPlatformOverview(organizationId, "7d", now);
  const byKey = new Map(overview.senders.map((sender) => [sender.key, sender]));
  const organization = byKey.get(ORGANIZATION_SENDER);
  const abidjan = byKey.get(accounts.abidjan);
  const yakro = byKey.get(accounts.yakro);

  assert.equal(organization?.counts.delivered, 10);
  assert.equal(organization?.counts.failed, 3);
  assert.equal(abidjan?.health, "failing");
  assert.equal(abidjan?.label, "•••• 9999");
  assert.equal(abidjan?.application, "Application abidjan");
  // Disabled, but it sent this week: shown, as unavailable.
  assert.equal(yakro?.health, "unavailable");
  assert.equal(yakro?.counts.sent, 3);
});

test("what changed is spelled out", { skip: !hasDatabase }, async () => {
  const overview = await loadPlatformOverview(organizationId, "7d", now);
  const kinds = overview.changes.map((change) => change.kind);
  assert.ok(kinds.includes("sender_failing"));
  assert.ok(kinds.includes("failure_rate"));
  assert.ok(kinds.includes("volume_drop"));
  assert.ok(kinds.includes("new_failure"), "le modèle requis n'existait pas la semaine précédente");
});

test("channels: SMS disabled reads as unavailable, WhatsApp as failing", { skip: !hasDatabase }, async () => {
  const overview = await loadPlatformOverview(organizationId, "7d", now);
  const health = Object.fromEntries(overview.channels.map((channel) => [channel.channel, channel.health]));
  assert.deepEqual(health, { EMAIL: "healthy", WHATSAPP: "failing", SMS: "unavailable" });
});
