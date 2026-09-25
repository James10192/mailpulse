import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

// The queue reaches Prisma and the provider clients through the "@/" alias,
// which Node's type-strip runner cannot resolve, so its wiring is asserted on
// the source. The rules it applies are covered behaviourally in
// pacing-policy.test.ts.
const queue = readFileSync(resolve(process.cwd(), "src/lib/external-applications/consent-queue.ts"), "utf8");
const request = readFileSync(resolve(process.cwd(), "src/lib/external-applications/consent-request.ts"), "utf8");

test("pacing, quiet hours and the daily cap apply to the Baileys rail only", () => {
  assert.match(queue, /const paced = target\.provider\.kind === "baileys";/);
  assert.match(queue, /if \(paced && isQuietHour\(now, pacing\)\)/);
  assert.match(queue, /if \(result === "sent" && paced\) nextSendAt = new Date\(now\.getTime\(\) \+ pacingDelayMs\(\)\);/);
});

test("recipients who agreed are served before any new question", () => {
  const released = queue.indexOf('where: { status: "RELEASED", operation: { is: { providerAccountId, status: QUEUED_STATUS } } }');
  const cap = queue.indexOf("hasConsentRequestBudget(sentToday, pacing)");
  const newRequest = queue.indexOf("sendConsentRequest(target.application, target.provider, request, now)");
  assert.ok(released >= 0 && cap > released && newRequest > cap);
});

test("an account is sent to by one run at a time and only once its next slot is due", () => {
  assert.match(queue, /\{ OR: \[\{ nextSendAt: null \}, \{ nextSendAt: \{ lte: now \} \}\] \}/);
  assert.match(queue, /\{ OR: \[\{ leaseExpiresAt: null \}, \{ leaseExpiresAt: \{ lt: now \} \}\] \}/);
  assert.doesNotMatch(queue, /setTimeout|sleep\(/);
});

test("a request's expiry starts when it leaves, and is sent at most once", () => {
  assert.match(request, /where: \{ id: consent\.id, status: "PENDING", requestSentAt: null, requestAttempts: consent\.requestAttempts \}/);
  assert.match(request, /data: \{ requestSentAt: now, expiresAt: new Date\(now\.getTime\(\) \+ ttlMs\)/);
});
