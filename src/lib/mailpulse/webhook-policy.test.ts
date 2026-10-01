import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import {
  WEBHOOK_MAX_ATTEMPTS,
  WEBHOOK_RETRY_DELAYS_MS,
  decideAfterAttempt,
  describeAttempt,
  isPrivateAddress,
  isRetryable,
  signatureHeader,
  webhookUrlProblem,
} from "./webhook-policy";

const now = new Date("2026-10-01T12:00:00Z");

test("only what may pass later is retried", () => {
  for (const status of [408, 429, 500, 502, 503]) assert.equal(isRetryable({ kind: "http", status }), true, String(status));
  for (const status of [301, 400, 401, 403, 404, 410, 422]) assert.equal(isRetryable({ kind: "http", status }), false, String(status));
  assert.equal(isRetryable({ kind: "timeout" }), true);
  assert.equal(isRetryable({ kind: "network" }), true);
  assert.equal(isRetryable({ kind: "blocked", reason: "x" }), false);
});

test("retries follow the schedule, then fail for good", () => {
  const first = decideAfterAttempt({ kind: "http", status: 503 }, 1, now);
  assert.equal(first.status, "RETRYING");
  assert.equal(first.nextRetryAt?.getTime(), now.getTime() + WEBHOOK_RETRY_DELAYS_MS[0]);
  const fifth = decideAfterAttempt({ kind: "timeout" }, 5, now);
  assert.equal(fifth.nextRetryAt?.getTime(), now.getTime() + WEBHOOK_RETRY_DELAYS_MS[4]);
  assert.deepEqual(decideAfterAttempt({ kind: "timeout" }, WEBHOOK_MAX_ATTEMPTS, now), { status: "FAILED", nextRetryAt: null });
  assert.deepEqual(decideAfterAttempt({ kind: "http", status: 404 }, 1, now), { status: "FAILED", nextRetryAt: null });
  assert.deepEqual(decideAfterAttempt({ kind: "delivered" }, 3, now), { status: "DELIVERED", nextRetryAt: null });
});

test("a resend past the retry budget is one more try, not a new series", () => {
  assert.equal(decideAfterAttempt({ kind: "http", status: 500 }, WEBHOOK_MAX_ATTEMPTS + 1, now).status, "FAILED");
});

test("the log reads a classification, never a raw error", () => {
  assert.equal(describeAttempt({ kind: "http", status: 500 }), "HTTP 500");
  assert.equal(describeAttempt({ kind: "http", status: 302 }), "HTTP 302 (redirection non suivie)");
  assert.equal(describeAttempt({ kind: "timeout" }), "Délai dépassé");
  assert.equal(describeAttempt({ kind: "delivered" }), null);
});

test("internal and private destinations are refused", () => {
  for (const url of [
    "http://hooks.example.com/x",
    "https://localhost/x",
    "https://127.0.0.1/x",
    "https://10.0.0.5/x",
    "https://172.20.1.1/x",
    "https://192.168.1.10/x",
    "https://169.254.169.254/latest/meta-data",
    "https://[::1]/x",
    "https://[fd00::1]/x",
    "https://[::ffff:127.0.0.1]/x",
    "https://metadata.google.internal/x",
    "https://printer.local/x",
    "https://intranet/x",
    "https://user:pass@hooks.example.com/x",
    "https://localhost./x",
    "https://metadata.google.internal./x",
    "https://foo.internal./x",
    "https://[::7f00:1]/x",
    "https://[64:ff9b::a9fe:a9fe]/x",
    "https://[2002:7f00:1::]/x",
    "https://[fe80::1]/x",
    "https://2130706433/x",
    "https://0x7f.1/x",
    "pas une adresse",
  ]) {
    assert.ok(webhookUrlProblem(url), `${url} devrait être refusée`);
  }
  for (const url of ["https://hooks.example.com/mailpulse", "https://esbtp-abidjan.klassci.com/api/v1/hooks", "https://8.8.8.8/x", "https://[2606:4700::1111]/x", "https://[2002:808:808::]/x", "https://[64:ff9b::808:808]/x"]) {
    assert.equal(webhookUrlProblem(url), null, url);
  }
  assert.equal(isPrivateAddress("100.64.0.1"), true);
  assert.equal(isPrivateAddress("1.1.1.1"), false);
});

test("the signature is the documented HMAC, both secrets during the overlap", () => {
  const body = '{"type":"message.delivered"}';
  const expected = (secret: string) => `v1=${createHmac("sha256", secret).update(`1782996000.${body}`).digest("hex")}`;
  const single = signatureHeader({ current: "whsec_new", previous: null, previousExpiresAt: null }, "1782996000", body, now);
  assert.equal(single, expected("whsec_new"));

  const overlap = signatureHeader({ current: "whsec_new", previous: "whsec_old", previousExpiresAt: new Date(now.getTime() + 1000) }, "1782996000", body, now);
  assert.equal(overlap, `${expected("whsec_new")},${expected("whsec_old")}`);

  const expired = signatureHeader({ current: "whsec_new", previous: "whsec_old", previousExpiresAt: new Date(now.getTime() - 1) }, "1782996000", body, now);
  assert.equal(expired, expected("whsec_new"));
});
