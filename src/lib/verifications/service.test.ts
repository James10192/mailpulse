import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { checkVerification } from "./check.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { generateVerificationCode, hashVerificationCode, verificationCodeMatches } from "./code.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { buildVerificationMessage } from "./message.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { createMemoryStore } from "./memory-store.fixture.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { SEND_LIMIT_LOOKBACK_MS, VERIFICATION_MAX_ATTEMPTS, VERIFICATION_TTL_MS, effectiveStatus, evaluateSendLimits } from "./policy.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { startVerification } from "./start.ts";
import type { TransportOutcome, VerificationDeps } from "./types";

const SECRET = "k".repeat(32);
const PHONE = "+2250700000000";

/** Real rules, in-memory store, controllable clock and a transport that records what it was asked to send. */
function harness(outcome: () => Promise<TransportOutcome> = async () => ({ ok: true, provider: "EVOLUTION_API", providerMessageId: "wamid.1" })) {
  const { store, rows } = createMemoryStore();
  let now = new Date("2026-09-23T10:00:00.000Z");
  const sent: Array<{ to: string; text: string }> = [];
  const deps: VerificationDeps = {
    store,
    now: () => now,
    rules: {
      ttlMs: VERIFICATION_TTL_MS,
      maxAttempts: VERIFICATION_MAX_ATTEMPTS,
      lookbackMs: SEND_LIMIT_LOOKBACK_MS,
      generateCode: generateVerificationCode,
      hashCode: (code: string) => hashVerificationCode(SECRET, code),
      codeMatches: (code: string, hash: string) => verificationCodeMatches(SECRET, code, hash),
      evaluateSendLimits,
      effectiveStatus,
      buildMessage: (locale: "fr" | "en", code: string) => buildVerificationMessage(locale, code, 10),
    },
  };
  const transport = { send: async (to: string, text: string) => { sent.push({ to, text }); return outcome(); } };
  const start = (overrides: Partial<{ organizationId: string; apiKeyId: string; phoneNumber: string }> = {}) =>
    startVerification(deps, { organizationId: "org_a", apiKeyId: "key_a", phoneNumber: PHONE, locale: "fr", reference: null, transport, ...overrides });
  const lastCode = () => /(\d{6})/.exec(sent[sent.length - 1].text)?.[1] ?? "";
  const advance = (ms: number) => { now = new Date(now.getTime() + ms); };
  return { deps, rows, sent, start, lastCode, advance };
}

const wrong = (code: string) => (code === "000000" ? "111111" : "000000");

test("a started verification sends the code once and stores only its hash", async () => {
  const h = harness();
  const result = await h.start();

  assert.equal(result.type, "sent");
  assert.equal(h.sent.length, 1);
  assert.equal(h.sent[0].to, PHONE);
  const code = h.lastCode();
  assert.match(h.sent[0].text, new RegExp(`^Votre code de vérification est ${code}\\.`));
  assert.equal(JSON.stringify(h.rows).includes(code), false);
  assert.equal(h.rows[0].expiresAt.getTime() - h.rows[0].createdAt.getTime(), 10 * 60_000);
});

test("the right code approves once, and cannot be reused", async () => {
  const h = harness();
  const started = await h.start();
  const id = started.type === "sent" ? started.verification.id : "";

  assert.deepEqual(await checkVerification(h.deps, { organizationId: "org_a", id, code: h.lastCode() }), { type: "approved", id });
  assert.deepEqual(await checkVerification(h.deps, { organizationId: "org_a", id, code: h.lastCode() }), { type: "refused", id, status: "APPROVED" });
});

test("two simultaneous right codes approve exactly once", async () => {
  const h = harness();
  const started = await h.start();
  const id = started.type === "sent" ? started.verification.id : "";
  const input = { organizationId: "org_a", id, code: h.lastCode() };

  const results = await Promise.all([checkVerification(h.deps, input), checkVerification(h.deps, input)]);
  assert.equal(results.filter((result) => result.type === "approved").length, 1);
});

test("wrong codes consume attempts and the fifth locks the verification, even for the right code", async () => {
  const h = harness();
  const started = await h.start();
  const id = started.type === "sent" ? started.verification.id : "";
  const code = h.lastCode();

  for (let attempt = 1; attempt < 5; attempt += 1) {
    assert.deepEqual(await checkVerification(h.deps, { organizationId: "org_a", id, code: wrong(code) }), { type: "refused", id, status: "PENDING" });
  }
  assert.deepEqual(await checkVerification(h.deps, { organizationId: "org_a", id, code: wrong(code) }), { type: "refused", id, status: "MAX_ATTEMPTS" });
  assert.deepEqual(await checkVerification(h.deps, { organizationId: "org_a", id, code }), { type: "refused", id, status: "MAX_ATTEMPTS" });
});

test("a code checked after ten minutes is expired and the expiry is recorded", async () => {
  const h = harness();
  const started = await h.start();
  const id = started.type === "sent" ? started.verification.id : "";
  h.advance(10 * 60_000);

  assert.deepEqual(await checkVerification(h.deps, { organizationId: "org_a", id, code: h.lastCode() }), { type: "refused", id, status: "EXPIRED" });
  assert.equal(h.rows[0].status, "EXPIRED");
});

test("another organization cannot see or check a verification", async () => {
  const h = harness();
  const started = await h.start();
  const id = started.type === "sent" ? started.verification.id : "";

  assert.deepEqual(await checkVerification(h.deps, { organizationId: "org_b", id, code: h.lastCode() }), { type: "not_found" });
  assert.equal(h.rows[0].attempts, 0);
});

test("resending after a minute cancels the previous code; only the new one works", async () => {
  const h = harness();
  const first = await h.start();
  const firstCode = h.lastCode();
  h.advance(61_000);
  const second = await h.start();

  const firstId = first.type === "sent" ? first.verification.id : "";
  const secondId = second.type === "sent" ? second.verification.id : "";
  assert.deepEqual(await checkVerification(h.deps, { organizationId: "org_a", id: firstId, code: firstCode }), { type: "refused", id: firstId, status: "CANCELED" });
  assert.deepEqual(await checkVerification(h.deps, { organizationId: "org_a", id: secondId, code: h.lastCode() }), { type: "approved", id: secondId });
});

test("a second send within a minute is refused without reaching the transport", async () => {
  const h = harness();
  await h.start();
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
  await h.start();
  assert.equal((await h.start({ organizationId: "org_b", apiKeyId: "key_b" })).type, "sent");
});

test("a key is capped at twenty sends an hour across numbers", async () => {
  const h = harness();
  for (let index = 0; index < 20; index += 1) {
    assert.equal((await h.start({ phoneNumber: `+22507000000${String(index).padStart(2, "0")}` })).type, "sent");
  }
  const refused = await h.start({ phoneNumber: "+2250700000099" });
  assert.equal(refused.type, "rate_limited");
});

test("a transport failure marks the verification failed with the provider error", async () => {
  const h = harness(async () => ({ ok: false, provider: "EVOLUTION_API", error: "session disconnected" }));
  const result = await h.start();

  assert.equal(result.type, "failed");
  assert.equal(h.rows[0].status, "FAILED");
  assert.equal(h.rows[0].errorMessage, "session disconnected");
});

test("a transport that throws is recorded as a failure, not an unhandled error", async () => {
  const h = harness(async () => { throw new Error("socket hang up"); });
  const result = await h.start();

  assert.equal(result.type, "failed");
  assert.equal(h.rows[0].errorMessage, "socket hang up");
});
