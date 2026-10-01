// Runs against a real database (DATABASE_URL, as in CI). Skipped without one.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";

process.env.EXTERNAL_APPLICATION_KEK ??= Buffer.alloc(32, 7).toString("base64");
const hasDatabase = Boolean(process.env.DATABASE_URL);

const { prisma } = await import("@/lib/prisma");
const { messageRouting, resolveWhatsAppSender } = await import("./whatsapp-sender");

const run = randomUUID().slice(0, 8);
const ids = { organization: `org-${run}`, otherOrganization: `org-other-${run}` };
const created = { abidjan: "", yakro: "", abidjanAccount: "", yakroAccount: "" };

const LEGACY_ORGANIZATION = {
  whatsappEnabled: true,
  whatsappMode: "BAILEYS" as const,
  whatsappPhone: "+22541540178",
  evoInstanceName: `mp-org-${run}`,
  evoInstanceStatus: "open",
  metaWabaId: null,
  metaPhoneNumberId: null,
  metaAccessToken: null,
};

before(async () => {
  if (!hasDatabase) return;
  await prisma.organization.createMany({
    data: [
      { id: ids.organization, name: "KLASSCI", slug: `klassci-${run}` },
      { id: ids.otherOrganization, name: "Autre", slug: `autre-${run}` },
    ],
  });
  for (const school of ["abidjan", "yakro"] as const) {
    const application = await prisma.externalApplication.create({
      data: { organizationId: ids.organization, key: `esbtp-${school}`, name: `KLASSCI esbtp-${school}` },
    });
    const account = await prisma.providerAccount.create({
      data: {
        organizationId: ids.organization,
        applicationId: application.id,
        channel: "WHATSAPP",
        provider: "BAILEYS_WHATSAPP",
        externalAccountId: `mp-${school}-${run}`,
        senderId: school === "abidjan" ? "2250700000001" : "2250700000002",
        label: `ESBTP ${school}`,
      },
    });
    created[school] = application.id;
    created[`${school}Account`] = account.id;
  }
});

after(async () => {
  if (!hasDatabase) return;
  for (const organizationId of [ids.organization, ids.otherOrganization]) {
    await prisma.communicationMessage.deleteMany({ where: { organizationId } });
    await prisma.conversation.deleteMany({ where: { organizationId } });
    await prisma.integrationApiKey.deleteMany({ where: { organizationId } });
    await prisma.providerAccount.deleteMany({ where: { organizationId } });
    await prisma.externalApplication.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
});

/** What message creation records: the resolved sender, routed as messages.ts does. */
async function route(applicationId: string | null) {
  return messageRouting(await resolveWhatsAppSender(ids.organization, applicationId), LEGACY_ORGANIZATION);
}

test("two schools resolving at the same time each get their own number", { skip: !hasDatabase }, async () => {
  const [abidjan, yakro] = await Promise.all([route(created.abidjan), route(created.yakro)]);

  assert.equal(abidjan.senderAccountId, created.abidjanAccount);
  assert.equal(yakro.senderAccountId, created.yakroAccount);
  assert.deepEqual(yakro.senderSnapshot, {
    source: "application",
    provider: "EVOLUTION_API",
    label: "ESBTP yakro",
    address: "2250700000002",
  });
});

test("a key without an application keeps the organization's number", { skip: !hasDatabase }, async () => {
  const routing = await route(null);
  assert.equal(routing.senderAccountId, null);
  assert.deepEqual(routing.senderSnapshot, { source: "organization", provider: "EVOLUTION_API", label: null, address: "+22541540178" });
});

test("another organization's application resolves to nothing of this one", { skip: !hasDatabase }, async () => {
  const sender = await resolveWhatsAppSender(ids.otherOrganization, created.abidjan);
  assert.deepEqual(sender, { kind: "organization" });
});

test("a school whose number is disabled is refused, never given another number", { skip: !hasDatabase }, async () => {
  await prisma.providerAccount.update({ where: { id: created.yakroAccount }, data: { active: false } });
  try {
    const routing = await route(created.yakro);
    assert.equal(routing.refused, true);
    assert.equal(routing.senderAccountId, null);
  } finally {
    await prisma.providerAccount.update({ where: { id: created.yakroAccount }, data: { active: true } });
  }
});

test("a message keeps its number when the school's number is relabelled later", { skip: !hasDatabase }, async () => {
  const routing = await route(created.abidjan);
  const message = await prisma.communicationMessage.create({
    data: {
      organizationId: ids.organization,
      applicationId: created.abidjan,
      senderAccountId: routing.senderAccountId,
      senderSnapshot: routing.senderSnapshot ?? undefined,
      channel: "WHATSAPP",
      recipientType: "PHONE",
      recipientValue: "+2250707123456",
      contentType: "TEXT",
      text: "Bonjour",
    },
  });
  await prisma.providerAccount.update({ where: { id: created.abidjanAccount }, data: { label: "Nouveau nom" } });
  const stored = await prisma.communicationMessage.findUniqueOrThrow({ where: { id: message.id } });
  assert.equal(stored.senderAccountId, created.abidjanAccount);
  assert.equal((stored.senderSnapshot as { label: string }).label, "ESBTP abidjan");
});

test("neither a key nor a message can point at another organization's application or number", { skip: !hasDatabase }, async () => {
  await assert.rejects(prisma.integrationApiKey.create({
    data: {
      organizationId: ids.otherOrganization,
      applicationId: created.abidjan,
      name: "intrus",
      keyHash: `hash-${run}`,
      keyPrefix: "mp_live",
    },
  }));
  await assert.rejects(prisma.communicationMessage.create({
    data: {
      organizationId: ids.otherOrganization,
      senderAccountId: created.abidjanAccount,
      channel: "WHATSAPP",
      recipientType: "PHONE",
      recipientValue: "+2250707123456",
      contentType: "TEXT",
    },
  }));
});
