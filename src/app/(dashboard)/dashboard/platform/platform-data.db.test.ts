// The registry tab's real queries against a database (DATABASE_URL, as in CI). Skipped without one.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";

const hasDatabase = Boolean(process.env.DATABASE_URL);

const { prisma } = await import("@/lib/prisma");
const { loadMessagesTab } = await import("./platform-data");
const { normalizeMessageFilters } = await import("./message-filters");

const run = randomUUID().slice(0, 8);
const organizationId = `org-registry-${run}`;
const otherOrganizationId = `org-registry-other-${run}`;
const now = new Date("2026-10-01T12:00:00Z");
const ids = { account: "", fromAccount: "", fromOrganization: "", foreign: "", campaign: "" };

async function message(data: { organization?: string; senderAccountId?: string | null; snapshot?: object; at: Date; origin?: "API" | "CAMPAIGN" }) {
  const created = await prisma.communicationMessage.create({
    data: {
      organizationId: data.organization ?? organizationId,
      channel: "WHATSAPP",
      origin: data.origin ?? "API",
      recipientType: "PHONE",
      recipientValue: "+2250701020304",
      contentType: "TEXT",
      text: "Votre code est 123456",
      status: "DELIVERED",
      senderAccountId: data.senderAccountId ?? null,
      senderSnapshot: data.snapshot,
      createdAt: data.at,
    },
    select: { id: true },
  });
  return created.id;
}

before(async () => {
  if (!hasDatabase) return;
  await prisma.organization.createMany({
    data: [
      { id: organizationId, name: "École", slug: `registre-${run}`, whatsappEnabled: true },
      { id: otherOrganizationId, name: "Autre", slug: `registre-autre-${run}` },
    ],
  });
  const application = await prisma.externalApplication.create({ data: { organizationId, key: "ecole", name: "École A" } });
  const account = await prisma.providerAccount.create({
    data: { organizationId, applicationId: application.id, channel: "WHATSAPP", provider: "BAILEYS_WHATSAPP", externalAccountId: `mp-${run}`, label: "École A" },
  });
  ids.account = account.id;
  ids.fromAccount = await message({ senderAccountId: account.id, snapshot: { source: "application", provider: "BAILEYS_WHATSAPP", label: "École A", address: null }, at: new Date("2026-10-01T08:00:00Z") });
  ids.fromOrganization = await message({ at: new Date("2026-09-29T23:30:00Z") });
  await message({ at: new Date("2026-09-29T00:10:00Z") });
  ids.campaign = await message({ at: new Date("2026-09-29T10:00:00Z"), origin: "CAMPAIGN" });
  ids.foreign = await message({ organization: otherOrganizationId, at: new Date("2026-10-01T08:00:00Z") });
});

after(async () => {
  if (!hasDatabase) return;
  for (const id of [organizationId, otherOrganizationId]) {
    await prisma.communicationMessage.deleteMany({ where: { organizationId: id } });
    await prisma.providerAccount.deleteMany({ where: { organizationId: id } });
    await prisma.externalApplication.deleteMany({ where: { organizationId: id } });
    await prisma.organization.delete({ where: { id } });
  }
  await prisma.$disconnect();
});

const load = (params: Record<string, string>, options: { canSeePersonalData?: boolean; messageId?: string | null } = {}) =>
  loadMessagesTab(organizationId, normalizeMessageFilters({ period: "all", ...params }), { now, canSeePersonalData: options.canSeePersonalData ?? true, messageId: options.messageId ?? null });

test("daily volume is counted by the database per UTC day, campaigns aside", { skip: !hasDatabase }, async () => {
  const { volume } = await load({});
  assert.equal(volume.length, 14);
  assert.deepEqual(volume.slice(-3).map((day) => day.messages), [2, 0, 1]);
  assert.equal(volume.reduce((sum, day) => sum + day.messages, 0), 3);
});

test("the sender filter separates an application's number from the organization's", { skip: !hasDatabase }, async () => {
  const ofAccount = await load({ sender: ids.account });
  assert.deepEqual(ofAccount.messages.map((item) => item.id), [ids.fromAccount]);
  assert.equal(ofAccount.messages[0].sender, "École A");

  const ofOrganization = await load({ sender: "organization" });
  assert.equal(ofOrganization.total, 2);
  assert.ok(!ofOrganization.messages.some((item) => item.id === ids.fromAccount));
  assert.deepEqual(ofOrganization.senderOptions.map((option) => option.key), ["organization", ids.account]);
});

test("a shared link opens its message, never another organization's", { skip: !hasDatabase }, async () => {
  assert.equal((await load({}, { messageId: ids.fromOrganization })).linkedMessage?.id, ids.fromOrganization);
  assert.equal((await load({}, { messageId: ids.foreign })).linkedMessage, null);
  // Campaigns have their own space: the registry never opens one.
  assert.equal((await load({}, { messageId: ids.campaign })).linkedMessage, null);
});

test("a member who does not manage sees no recipient and no content", { skip: !hasDatabase }, async () => {
  const masked = await load({}, { canSeePersonalData: false, messageId: ids.fromAccount });
  const serialized = JSON.stringify([masked.messages, masked.linkedMessage]);
  assert.ok(!serialized.includes("0701020304"));
  assert.ok(!serialized.includes("123456"));
});

test("a member who does not manage cannot look someone up by number", { skip: !hasDatabase }, async () => {
  assert.equal((await load({ query: "0701020304" })).total, 3);
  assert.equal((await load({ query: "0701020304" }, { canSeePersonalData: false })).total, 0);
  assert.equal((await load({ query: ids.fromAccount }, { canSeePersonalData: false })).total, 1);
});

test("the delivery log is scoped to the organization, filtered and counted", { skip: !hasDatabase }, async () => {
  const { loadWebhooksTab, readWebhookFilters } = await import("./platform-data");
  const endpoint = await prisma.webhookEndpoint.create({
    data: { organizationId, name: "ERP", url: "https://hooks.example.com/x", events: ["message.delivered"], signingSecret: "whsec_a", secretHash: "h", secretPreview: "whsec_…a" },
  });
  const foreign = await prisma.webhookEndpoint.create({
    data: { organizationId: otherOrganizationId, name: "Autre", url: "https://hooks.example.com/y", events: ["message.delivered"], signingSecret: "whsec_b", secretHash: "h", secretPreview: "whsec_…b" },
  });
  const delivery = (endpointId: string, organization: string, status: "DELIVERED" | "FAILED" | "RETRYING", index: number) => ({
    organizationId: organization, endpointId, eventId: `evt-${run}-${status}-${index}-${endpointId}`, eventType: "message.delivered", payload: {}, status,
    deliveredAt: status === "DELIVERED" ? now : null, createdAt: new Date(now.getTime() - index * 60_000),
  });
  await prisma.webhookDelivery.createMany({
    data: [
      delivery(endpoint.id, organizationId, "DELIVERED", 1),
      delivery(endpoint.id, organizationId, "DELIVERED", 2),
      delivery(endpoint.id, organizationId, "FAILED", 3),
      delivery(endpoint.id, organizationId, "RETRYING", 4),
      delivery(foreign.id, otherOrganizationId, "FAILED", 5),
    ],
  });

  const all = await loadWebhooksTab(organizationId, readWebhookFilters({}), now);
  assert.deepEqual(all.endpoints.map((item) => item.name), ["ERP"]);
  assert.equal(all.total, 4);
  assert.deepEqual(all.endpoints[0].week, { delivered: 2, failed: 1, waiting: 1 });
  assert.equal(all.statusCounts.FAILED, 1);

  const failed = await loadWebhooksTab(organizationId, readWebhookFilters({ deliveryStatus: "failed" }), now);
  assert.equal(failed.total, 1);
  // Another organization's endpoint id shows nothing.
  const crossed = await loadWebhooksTab(organizationId, readWebhookFilters({ endpoint: foreign.id }), now);
  assert.equal(crossed.total, 0);

  await prisma.webhookDelivery.deleteMany({ where: { organizationId: { in: [organizationId, otherOrganizationId] } } });
  await prisma.webhookEndpoint.deleteMany({ where: { id: { in: [endpoint.id, foreign.id] } } });
});
