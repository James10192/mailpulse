// Runs against a real database (DATABASE_URL, as in CI). Skipped without one.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";

process.env.EXTERNAL_APPLICATION_KEK ??= Buffer.alloc(32, 7).toString("base64");
process.env.EVOLUTION_API_URL = "https://evolution.test";
process.env.EVOLUTION_API_KEY = "test-key";
const hasDatabase = Boolean(process.env.DATABASE_URL);

const { prisma } = await import("@/lib/prisma");
const { dispatchExternalApplicationCommand } = await import("./commands");
const { encryptExternalApplicationValue, hashExternalApplicationPayload } = await import("./crypto");

const run = randomUUID().slice(0, 8);
const organizationId = `org-rebind-${run}`;
const ids = { application: "", oldAccount: "", newAccount: "" };

before(async () => {
  if (!hasDatabase) return;
  await prisma.organization.create({ data: { id: organizationId, name: "École", slug: `ecole-${run}` } });
  const application = await prisma.externalApplication.create({ data: { organizationId, key: "ecole", name: "École" } });
  const accounts = await Promise.all(["old", "new"].map((which) => prisma.providerAccount.create({
    data: {
      organizationId,
      applicationId: application.id,
      channel: "WHATSAPP",
      provider: "BAILEYS_WHATSAPP",
      externalAccountId: `mp-${which}-${run}`,
      active: which === "new",
    },
  })));
  ids.application = application.id;
  ids.oldAccount = accounts[0].id;
  ids.newAccount = accounts[1].id;
});

after(async () => {
  if (!hasDatabase) return;
  await prisma.externalCallbackDelivery.deleteMany({ where: { operation: { organizationId } } });
  await prisma.externalTransportOperation.deleteMany({ where: { organizationId } });
  await prisma.providerAccount.deleteMany({ where: { organizationId } });
  await prisma.externalApplication.deleteMany({ where: { organizationId } });
  await prisma.organization.delete({ where: { id: organizationId } });
  await prisma.$disconnect();
});

test("a never-sent command retried after a number change leaves from, and is recorded on, the new number", { skip: !hasDatabase }, async () => {
  const command = { operationKey: "notice", idempotencyKey: `idem-${run}`, recipient: "+2250707123456", content: { type: "text" as const, text: "Bonjour" } };
  const payload = JSON.stringify(command);
  // Accepted while the old number was active, then interrupted before leaving.
  const operation = await prisma.externalTransportOperation.create({
    data: {
      organizationId,
      applicationId: ids.application,
      providerAccountId: ids.oldAccount,
      direction: "OUTBOUND",
      operationKey: command.operationKey,
      idempotencyKey: command.idempotencyKey,
      payloadHash: hashExternalApplicationPayload(payload),
      payloadCiphertext: encryptExternalApplicationValue(payload),
    },
  });

  const urls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request) => {
    urls.push(String(url));
    return Response.json({ key: { remoteJid: "x", fromMe: true, id: `3EB0-${run}` } }, { status: 201 });
  }) as typeof fetch;
  try {
    const result = await dispatchExternalApplicationCommand({ id: ids.application, key: "ecole", organizationId }, command);
    assert.equal(result.status, "accepted");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const stored = await prisma.externalTransportOperation.findUniqueOrThrow({ where: { id: operation.id } });
  assert.equal(stored.providerAccountId, ids.newAccount);
  const sends = urls.filter((url) => url.includes("/message/"));
  assert.ok(sends.length > 0 && sends.every((url) => url.includes(`/mp-new-${run}`)), urls.join(", "));
});
