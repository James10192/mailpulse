// The delivery engine against a real database (DATABASE_URL, as in CI), with
// the receiver simulated by a stubbed transport. Skipped without a database.
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { createHmac, randomUUID } from "node:crypto";

const hasDatabase = Boolean(process.env.DATABASE_URL);

const { prisma } = await import("@/lib/prisma");
const webhooks = await import("./webhooks");
const { WEBHOOK_LEASE_MS, WEBHOOK_MAX_ATTEMPTS, webhookUrlProblem } = await import("./webhook-policy");
const { webhookTransport } = await import("./webhook-transport");

const run = randomUUID().slice(0, 8);
const organizationId = `org-webhooks-${run}`;
const otherOrganizationId = `org-webhooks-other-${run}`;
const realPost = webhookTransport.post;

type Call = { url: string; headers: Record<string, string>; body: string; timeoutMs: number };
let calls: Call[] = [];
let respond: (call: Call) => Response | Promise<Response> = () => new Response("ok");

// The receiver, simulated: the URL check still runs, as in the real transport.
function stubTransport() {
  webhookTransport.post = async (url, headers, body, timeoutMs) => {
    const problem = webhookUrlProblem(url);
    if (problem) return { kind: "blocked", reason: problem };
    const call = { url, headers, body, timeoutMs };
    calls.push(call);
    const response = await respond(call);
    return response.ok ? { kind: "delivered" } : { kind: "http", status: response.status };
  };
}

let endpointId = "";

before(async () => {
  if (!hasDatabase) return;
  stubTransport();
  await prisma.organization.createMany({
    data: [
      { id: organizationId, name: "École", slug: `wh-${run}`, plan: "PRO" },
      { id: otherOrganizationId, name: "Autre", slug: `wh-autre-${run}`, plan: "PRO" },
    ],
  });
  const { endpoint } = await webhooks.createWebhookEndpoint({ organizationId, name: "ERP", url: "https://hooks.example.com/mailpulse", events: ["message.delivered"] });
  endpointId = endpoint.id;
});

beforeEach(async () => {
  calls = [];
  respond = () => new Response("ok");
  if (hasDatabase) await prisma.webhookDelivery.deleteMany({ where: { organizationId: { in: [organizationId, otherOrganizationId] } } });
});

after(async () => {
  webhookTransport.post = realPost;
  if (!hasDatabase) return;
  for (const id of [organizationId, otherOrganizationId]) {
    await prisma.webhookDelivery.deleteMany({ where: { organizationId: id } });
    await prisma.webhookEndpoint.deleteMany({ where: { organizationId: id } });
    await prisma.organization.delete({ where: { id } });
  }
  await prisma.$disconnect();
});

const emit = () => webhooks.emitWebhookEvent({ organizationId, type: "message.delivered", data: { message: { id: "m1" } } });
const onlyDelivery = async () => (await prisma.webhookDelivery.findMany({ where: { organizationId } }))[0];

test("a delivered event is signed as documented and recorded", { skip: !hasDatabase }, async () => {
  await emit();
  const delivery = await onlyDelivery();
  assert.equal(delivery.status, "DELIVERED");
  assert.equal(delivery.attempts, 1);
  assert.equal(delivery.nextRetryAt, null);

  const [call] = calls;
  const endpoint = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpointId } });
  const expected = createHmac("sha256", endpoint.signingSecret).update(`${call.headers["mailpulse-timestamp"]}.${call.body}`).digest("hex");
  assert.equal(call.headers["mailpulse-signature"], `v1=${expected}`);
  assert.equal(call.headers["mailpulse-event-id"], delivery.eventId);
  // Inside the request that sent the message, the attempt is kept short.
  assert.equal(call.timeoutMs, 3_000);
});

test("a 503 is retried later, a 404 fails at once", { skip: !hasDatabase }, async () => {
  respond = () => new Response("", { status: 503 });
  await emit();
  const retrying = await onlyDelivery();
  assert.equal(retrying.status, "RETRYING");
  assert.equal(retrying.lastError, "HTTP 503");
  assert.ok(retrying.nextRetryAt && retrying.nextRetryAt > new Date());

  await prisma.webhookDelivery.deleteMany({ where: { organizationId } });
  respond = () => new Response("", { status: 404 });
  await emit();
  const failed = await onlyDelivery();
  assert.equal(failed.status, "FAILED");
  assert.equal(failed.nextRetryAt, null);
});

test("the retry run sends what is due, once, even with two runs at the same time", { skip: !hasDatabase }, async () => {
  respond = () => new Response("", { status: 500 });
  await emit();
  const delivery = await onlyDelivery();
  // Make it due now.
  await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { nextRetryAt: new Date(Date.now() - 1000) } });

  respond = () => new Response("ok");
  calls = [];
  const [first, second] = await Promise.all([webhooks.processDueWebhookDeliveries(), webhooks.processDueWebhookDeliveries()]);
  assert.equal(calls.length, 1, "un seul envoi malgré deux passages simultanés");
  assert.equal(first.delivered + second.delivered, 1);
  const done = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
  assert.equal(done.status, "DELIVERED");
  assert.equal(done.attempts, 2);
  // The same event id: the receiver can recognise a duplicate.
  assert.equal(calls[0].headers["mailpulse-event-id"], delivery.eventId);
});

test("two runs that read the same delivery cannot both claim it", { skip: !hasDatabase }, async () => {
  const delivery = await prisma.webhookDelivery.create({
    data: { organizationId, endpointId, eventId: randomUUID(), eventType: "message.delivered", payload: {}, status: "RETRYING", nextRetryAt: new Date(Date.now() - 1000) },
    select: { id: true, status: true, nextRetryAt: true },
  });
  const snapshot = delivery as { id: string; status: "RETRYING"; nextRetryAt: Date | null };
  const claims = await Promise.all([webhooks.claimWebhookDelivery(snapshot, new Date()), webhooks.claimWebhookDelivery(snapshot, new Date())]);
  assert.deepEqual(claims.sort(), [false, true]);
});

test("a delivery left mid-attempt by a crash is picked up after its lease", { skip: !hasDatabase }, async () => {
  const delivery = await prisma.webhookDelivery.create({
    data: { organizationId, endpointId, eventId: randomUUID(), eventType: "message.delivered", payload: { type: "message.delivered" }, status: "PENDING", nextRetryAt: new Date(Date.now() + WEBHOOK_LEASE_MS) },
  });
  assert.equal((await webhooks.processDueWebhookDeliveries()).examined, 0, "pas avant la fin du bail");
  const later = new Date(Date.now() + WEBHOOK_LEASE_MS + 1000);
  const result = await webhooks.processDueWebhookDeliveries(50, later);
  assert.equal(result.delivered, 1);
  assert.equal((await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } })).status, "DELIVERED");
});

test("retries stop after the last attempt", { skip: !hasDatabase }, async () => {
  respond = () => new Response("", { status: 502 });
  await emit();
  const delivery = await onlyDelivery();
  await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { attempts: WEBHOOK_MAX_ATTEMPTS - 1, nextRetryAt: new Date(Date.now() - 1000) } });
  await webhooks.processDueWebhookDeliveries();
  const final = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
  assert.equal(final.status, "FAILED");
  assert.equal(final.attempts, WEBHOOK_MAX_ATTEMPTS);
});

test("a disabled endpoint receives nothing more", { skip: !hasDatabase }, async () => {
  respond = () => new Response("", { status: 500 });
  await emit();
  const delivery = await onlyDelivery();
  await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { active: false } });
  await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { nextRetryAt: new Date(Date.now() - 1000) } });
  calls = [];
  await webhooks.processDueWebhookDeliveries();
  await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { active: true } });
  assert.equal(calls.length, 0);
  const final = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
  assert.equal(final.status, "FAILED");
  assert.equal(final.lastError, "Webhook désactivé");
});

test("a URL that became internal is never called", { skip: !hasDatabase }, async () => {
  await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { url: "https://169.254.169.254/latest" } });
  await emit();
  await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { url: "https://hooks.example.com/mailpulse" } });
  assert.equal(calls.length, 0);
  const delivery = await onlyDelivery();
  assert.equal(delivery.status, "FAILED");
  assert.equal(delivery.lastError, "Adresse privée refusée");
});

test("a manual resend sends again only what has not arrived, and only in its organization", { skip: !hasDatabase }, async () => {
  respond = () => new Response("", { status: 404 });
  await emit();
  const failed = await onlyDelivery();
  respond = () => new Response("ok");
  calls = [];
  assert.equal(await webhooks.resendWebhookDelivery(otherOrganizationId, failed.id), null);
  assert.equal(calls.length, 0);

  const resent = await webhooks.resendWebhookDelivery(organizationId, failed.id);
  assert.equal(resent?.status, "DELIVERED");
  assert.equal(resent?.attempts, 2);
  assert.equal(await webhooks.resendWebhookDelivery(organizationId, failed.id), null, "un événement délivré n'est pas renvoyé");
});

test("after a rotation both secrets sign during the overlap", { skip: !hasDatabase }, async () => {
  const before = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpointId } });
  assert.equal(await webhooks.rotateWebhookSecret(otherOrganizationId, endpointId), null);
  const rotated = await webhooks.rotateWebhookSecret(organizationId, endpointId);
  assert.ok(rotated && "secret" in rotated && rotated.secret.startsWith("whsec_"));
  assert.notEqual(rotated?.secret, before.signingSecret);

  await emit();
  const [call] = calls;
  const sign = (secret: string) => `v1=${createHmac("sha256", secret).update(`${call.headers["mailpulse-timestamp"]}.${call.body}`).digest("hex")}`;
  assert.equal(call.headers["mailpulse-signature"], `${sign(rotated.secret)},${sign(before.signingSecret)}`);
});

test("a plan that loses webhooks stops its retries", { skip: !hasDatabase }, async () => {
  respond = () => new Response("", { status: 500 });
  await emit();
  const delivery = await onlyDelivery();
  await prisma.organization.update({ where: { id: organizationId }, data: { plan: "FREE" } });
  await prisma.webhookDelivery.update({ where: { id: delivery.id }, data: { nextRetryAt: new Date(Date.now() - 1000) } });
  calls = [];
  await webhooks.processDueWebhookDeliveries();
  await prisma.organization.update({ where: { id: organizationId }, data: { plan: "PRO" } });
  assert.equal(calls.length, 0);
  const final = await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: delivery.id } });
  assert.equal(final.status, "FAILED");
  assert.equal(final.lastError, "Webhooks non inclus dans le plan");
});

test("a delivery stuck from before leases existed is recovered", { skip: !hasDatabase }, async () => {
  const stuck = await prisma.webhookDelivery.create({
    data: { organizationId, endpointId, eventId: randomUUID(), eventType: "message.delivered", payload: {}, status: "PENDING", nextRetryAt: null, createdAt: new Date(Date.now() - WEBHOOK_LEASE_MS - 60_000) },
  });
  const fresh = await prisma.webhookDelivery.create({
    data: { organizationId, endpointId, eventId: randomUUID(), eventType: "message.delivered", payload: {}, status: "PENDING", nextRetryAt: null },
  });
  await webhooks.processDueWebhookDeliveries();
  assert.equal((await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: stuck.id } })).status, "DELIVERED");
  assert.equal((await prisma.webhookDelivery.findUniqueOrThrow({ where: { id: fresh.id } })).status, "PENDING", "peut-être encore en cours d'envoi");
});

test("a receiver that does not answer is skipped for the rest of the run", { skip: !hasDatabase }, async () => {
  const due = new Date(Date.now() - 1000);
  await prisma.webhookDelivery.createMany({
    data: Array.from({ length: 8 }, () => ({ organizationId, endpointId, eventId: randomUUID(), eventType: "message.delivered", payload: {}, status: "RETRYING" as const, nextRetryAt: due })),
  });
  const realPostForTest = webhookTransport.post;
  let attempts = 0;
  webhookTransport.post = async () => { attempts += 1; return { kind: "timeout" }; };
  const result = await webhooks.processDueWebhookDeliveries();
  webhookTransport.post = realPostForTest;
  stubTransport();
  // Five workers start together, then the endpoint is known dead.
  assert.ok(attempts <= 5, `${attempts} appels vers un point mort`);
  assert.equal(result.skipped, 8 - attempts);
});

test("two rotations at once never hand out a secret that was not stored", { skip: !hasDatabase }, async () => {
  const [first, second] = await Promise.all([webhooks.rotateWebhookSecret(organizationId, endpointId), webhooks.rotateWebhookSecret(organizationId, endpointId)]);
  const stored = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpointId } });
  const handedOut = [first, second].filter((result) => result && "secret" in result).map((result) => (result as { secret: string }).secret);
  assert.ok(handedOut.length >= 1);
  for (const secret of handedOut) assert.equal(secret, stored.signingSecret, "un secret remis doit être celui enregistré");
});

test("a previous secret is dropped once its overlap is over", { skip: !hasDatabase }, async () => {
  await prisma.webhookEndpoint.update({ where: { id: endpointId }, data: { previousSigningSecret: "whsec_old", previousSecretExpiresAt: new Date(Date.now() - 1000) } });
  await webhooks.processDueWebhookDeliveries();
  const endpoint = await prisma.webhookEndpoint.findUniqueOrThrow({ where: { id: endpointId } });
  assert.equal(endpoint.previousSigningSecret, null);
  assert.equal(endpoint.previousSecretExpiresAt, null);
});
