// Resend events for one message applied at the same time, against a real
// database (DATABASE_URL, as in CI). Skipped without one.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";

const hasDatabase = Boolean(process.env.DATABASE_URL);

const { prisma } = await import("@/lib/prisma");
const { applyResendDelivery } = await import("./resend-webhook-transaction");
const { parseResendWebhookPayload } = await import("./resend-webhook-payload");
const { isSerializationFailure } = await import("@/lib/prisma-errors");

const run = randomUUID().slice(0, 8);
const organizationId = `org-resend-conflict-${run}`;

before(async () => {
  if (!hasDatabase) return;
  await prisma.organization.create({ data: { id: organizationId, name: "École", slug: `resend-conflict-${run}` } });
});

after(async () => {
  if (!hasDatabase) return;
  await prisma.communicationMessageEvent.deleteMany({ where: { organizationId } });
  await prisma.communicationMessage.deleteMany({ where: { organizationId } });
  await prisma.organization.delete({ where: { id: organizationId } });
  await prisma.$disconnect();
});

async function sentMessage() {
  const emailId = `email-${randomUUID()}`;
  await prisma.communicationMessage.create({
    data: {
      organizationId,
      channel: "EMAIL",
      provider: "RESEND",
      providerMessageId: emailId,
      origin: "API",
      recipientType: "EMAIL",
      recipientValue: "parent@example.com",
      contentType: "TEXT",
      text: "Bulletin disponible",
      status: "SENT",
    },
  });
  return emailId;
}

/** A message's events, all arriving at once, as Resend sends them. */
function burst(emailId: string) {
  const types = ["email.delivered", "email.delivery_delayed", "email.opened", "email.clicked", "email.delivered", "email.opened"];
  return types.map((type, index) => {
    const parsed = parseResendWebhookPayload({
      type,
      created_at: new Date(Date.UTC(2026, 9, 1, 12, 0, index)).toISOString(),
      data: { email_id: emailId, ...(type === "email.clicked" ? { click: { link: "https://example.com" } } : {}) },
    });
    if (parsed.kind !== "event") throw new Error(`${type} did not parse`);
    return { event: parsed.event, deliveryId: `svix-${run}-${randomUUID()}` };
  });
}

test("without a replay, simultaneous events for one message conflict", { skip: !hasDatabase }, async () => {
  // The counter-test: it shows the situation the replay exists for is real here.
  let conflicts = 0;
  for (let round = 0; round < 5 && conflicts === 0; round += 1) {
    const emailId = await sentMessage();
    const results = await Promise.allSettled(burst(emailId).map((delivery) => applyResendDelivery(delivery, 0)));
    conflicts = results.filter((result) => result.status === "rejected" && isSerializationFailure(result.reason)).length;
  }
  assert.ok(conflicts > 0, "aucun conflit provoqué : le test suivant ne prouverait rien");
});

test("simultaneous events for one message all apply once replayed", { skip: !hasDatabase }, async () => {
  for (let round = 0; round < 5; round += 1) {
    const emailId = await sentMessage();
    const results = await Promise.allSettled(burst(emailId).map((delivery) => applyResendDelivery(delivery)));
    const rejected = results.filter((result) => result.status === "rejected");
    assert.deepEqual(rejected, [], "aucun événement ne doit échouer");

    const message = await prisma.communicationMessage.findFirstOrThrow({ where: { organizationId, providerMessageId: emailId } });
    assert.ok(["DELIVERED", "READ"].includes(message.status), `statut final ${message.status}`);
    assert.ok(message.deliveredAt, "la remise est enregistrée");
  }
});
