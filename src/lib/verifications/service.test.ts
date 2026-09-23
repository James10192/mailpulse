import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryStore } from "./memory-store.fixture";
import { checkVerification, startVerification, type VerificationServiceDeps } from "./service";
import type { VerificationTransport } from "./transport";

const SECRET = "k".repeat(32);
const PHONE = "+2250700000000";

/** Production service, in-memory store, controllable clock, recording transport. */
function harness(send: VerificationTransport["send"] = async () => ({ messageId: "wamid.1" })) {
  const { store, rows, whatsAppMessages } = createMemoryStore();
  let now = new Date("2026-09-23T10:00:00.000Z");
  const sent: Array<{ to: string; text: string }> = [];
  const deps: VerificationServiceDeps = { store, now: () => now, secret: SECRET };
  const transport: VerificationTransport = {
    provider: "EVOLUTION_API",
    send: (to, text) => { sent.push({ to, text }); return send(to, text); },
  };
  const start = (overrides: Partial<{ organizationId: string; apiKeyId: string; phoneNumber: string }> = {}) =>
    startVerification(deps, { organizationId: "org_a", apiKeyId: "key_a", phoneNumber: PHONE, locale: "fr", reference: null, transport, ...overrides });
  const startedId = async () => {
    const result = await start();
    assert.equal(result.type, "sent");
    return result.type === "sent" ? result.verification.id : "";
  };
  const check = (id: string, code: string, organizationId = "org_a") => checkVerification(deps, { organizationId, id, code });
  const lastCode = () => /(\d{6})/.exec(sent[sent.length - 1].text)?.[1] ?? "";
  const advance = (ms: number) => { now = new Date(now.getTime() + ms); };
  return { rows, whatsAppMessages, sent, start, startedId, check, lastCode, advance, now: () => now };
}

const wrong = (code: string) => (code === "000000" ? "111111" : "000000");

test("a started verification sends the French message once and stores only the hash", async () => {
  const h = harness();
  await h.startedId();

  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].to, PHONE);
  const code = h.lastCode();
  assert.equal(h.sent[0].text, `Votre code de vérification est ${code}. Il expire dans 10 minutes. Ne le partagez avec personne.`);
  assert.equal(JSON.stringify(h.rows).includes(code), false);
  assert.equal(h.rows[0].expiresAt.getTime() - h.rows[0].createdAt.getTime(), 10 * 60_000);
  assert.equal(h.rows[0].providerMessageId, "wamid.1");
  assert.equal(h.rows[0].provider, "EVOLUTION_API");
});

test("the right code approves once, and cannot be reused", async () => {
  const h = harness();
  const id = await h.startedId();

  assert.deepEqual(await h.check(id, h.lastCode()), { type: "approved", id });
  assert.deepEqual(await h.check(id, h.lastCode()), { type: "refused", id, status: "APPROVED" });
});

test("five simultaneous right codes approve exactly once", async () => {
  const h = harness();
  const id = await h.startedId();

  const results = await Promise.all(Array.from({ length: 5 }, () => h.check(id, h.lastCode())));
  assert.equal(results.filter((result) => result.type === "approved").length, 1);
});

test("wrong codes spend attempts; the fifth locks the verification, even for the right code", async () => {
  const h = harness();
  const id = await h.startedId();
  const code = h.lastCode();

  for (let attempt = 1; attempt < 5; attempt += 1) {
    assert.deepEqual(await h.check(id, wrong(code)), { type: "refused", id, status: "PENDING" });
  }
  assert.deepEqual(await h.check(id, wrong(code)), { type: "refused", id, status: "MAX_ATTEMPTS" });
  assert.deepEqual(await h.check(id, code), { type: "refused", id, status: "MAX_ATTEMPTS" });
  assert.equal(h.rows[0].attempts, 5);
});

test("a flood of concurrent guesses never compares more than five codes", async () => {
  const h = harness();
  const id = await h.startedId();
  const code = h.lastCode();

  await Promise.all(Array.from({ length: 20 }, () => h.check(id, wrong(code))));
  assert.equal(h.rows[0].attempts, 5);
  assert.equal(h.rows[0].status, "MAX_ATTEMPTS");
});

test("a right code after four wrong ones still approves", async () => {
  const h = harness();
  const id = await h.startedId();
  const code = h.lastCode();

  for (let attempt = 1; attempt < 5; attempt += 1) await h.check(id, wrong(code));
  assert.deepEqual(await h.check(id, code), { type: "approved", id });
});

test("a code checked after ten minutes is expired and the expiry is recorded", async () => {
  const h = harness();
  const id = await h.startedId();
  h.advance(10 * 60_000);

  assert.deepEqual(await h.check(id, h.lastCode()), { type: "refused", id, status: "EXPIRED" });
  assert.equal(h.rows[0].status, "EXPIRED");
  assert.equal(h.rows[0].attempts, 0);
});

test("another organization cannot check a verification, nor spend its attempts", async () => {
  const h = harness();
  const id = await h.startedId();

  assert.deepEqual(await h.check(id, h.lastCode(), "org_b"), { type: "not_found" });
  assert.equal(h.rows[0].attempts, 0);
});

test("resending after a minute cancels the previous code; only the new one works", async () => {
  const h = harness();
  const firstId = await h.startedId();
  const firstCode = h.lastCode();
  h.advance(61_000);
  const secondId = await h.startedId();

  assert.deepEqual(await h.check(firstId, firstCode), { type: "refused", id: firstId, status: "CANCELED" });
  assert.deepEqual(await h.check(secondId, h.lastCode()), { type: "approved", id: secondId });
});

test("a second send within a minute is refused without reaching the transport", async () => {
  const h = harness();
  await h.startedId();
  h.advance(15_000);

  assert.deepEqual(await h.start(), { type: "rate_limited", retryAfterSeconds: 45 });
  assert.equal(h.sent.length, 1);
  assert.equal(h.rows.length, 1);
});

test("concurrent sends for one number let exactly one through", async () => {
  const h = harness();
  const results = await Promise.all([h.start(), h.start(), h.start()]);

  assert.equal(results.filter((result) => result.type === "sent").length, 1);
  assert.equal(h.sent.length, 1);
});

test("limits are per organization: another organization can send to the same number", async () => {
  const h = harness();
  await h.startedId();
  assert.equal((await h.start({ organizationId: "org_b", apiKeyId: "key_b" })).type, "sent");
});

test("a key is capped at twenty sends an hour across numbers", async () => {
  const h = harness();
  for (let index = 0; index < 20; index += 1) {
    h.advance(2_100);
    assert.equal((await h.start({ phoneNumber: `+22507000000${String(index).padStart(2, "0")}` })).type, "sent");
  }
  assert.equal((await h.start({ phoneNumber: "+2250700000099" })).type, "rate_limited");
  assert.equal((await h.start({ phoneNumber: "+2250700000099", apiKeyId: "key_b" })).type, "sent");
});

test("an organization is capped at one hundred sends an hour, whatever the keys", async () => {
  const h = harness();
  for (let index = 0; index < 100; index += 1) {
    h.advance(2_100);
    const result = await h.start({ phoneNumber: `+2250700000${String(index).padStart(3, "0")}`, apiKeyId: `key_${index % 10}` });
    assert.equal(result.type, "sent");
  }
  assert.equal((await h.start({ phoneNumber: "+2250711111111", apiKeyId: "key_new" })).type, "rate_limited");
});

test("codes share the WhatsApp API rate with messages sent from the same number", async () => {
  const h = harness();
  for (let index = 0; index < 30; index += 1) h.whatsAppMessages.push({ organizationId: "org_a", createdAt: new Date(h.now().getTime() - 10_000) });

  assert.deepEqual(await h.start(), { type: "rate_limited", retryAfterSeconds: 50 });
  assert.equal(h.sent.length, 0);
});

test("a provider failure is stored as a classified code, never as the provider text", async () => {
  const h = harness(async () => { throw new Error("Le numéro 2250700000000 n'est pas enregistré sur WhatsApp."); });
  const result = await h.start();

  assert.equal(result.type, "failed");
  assert.equal(h.rows[0].status, "FAILED");
  assert.equal(h.rows[0].errorCode, "numero_non_whatsapp");
  const storedTexts = Object.values(h.rows[0]).filter((value) => typeof value === "string");
  assert.equal(storedTexts.some((value) => value.includes("enregistré")), false);
});

test("any other provider failure is recorded as a transport error", async () => {
  const h = harness(async () => { throw new Error("Evolution API 500"); });
  await h.start();
  assert.equal(h.rows[0].errorCode, "transport_erreur");
});
