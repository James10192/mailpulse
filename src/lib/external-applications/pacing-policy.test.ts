import assert from "node:assert/strict";
import { test } from "node:test";

import {
  DEFAULT_SENDER_PACING,
  effectiveSenderPacing,
  hasConsentRequestBudget,
  isQuietHour,
  localDayStart,
  pacingDelayMs,
  quietHoursEndAt,
} from "./pacing-policy";

// Africa/Abidjan is UTC+0 all year; Africa/Porto-Novo is UTC+1.
const at = (iso: string) => new Date(iso);

test("the pause between two messages stays within 15 to 45 s", () => {
  assert.equal(pacingDelayMs(() => 0), 15_000);
  assert.equal(pacingDelayMs(() => 1), 45_000);
  assert.equal(pacingDelayMs(() => 0.5), 30_000);
  for (let index = 0; index < 200; index += 1) {
    const delay = pacingDelayMs();
    assert.ok(delay >= 15_000 && delay <= 45_000, String(delay));
  }
});

test("nothing is sent between 21 h and 7 h, local time", () => {
  assert.equal(isQuietHour(at("2026-09-25T20:59:59Z"), DEFAULT_SENDER_PACING), false);
  assert.equal(isQuietHour(at("2026-09-25T21:00:00Z"), DEFAULT_SENDER_PACING), true);
  assert.equal(isQuietHour(at("2026-09-26T03:00:00Z"), DEFAULT_SENDER_PACING), true);
  assert.equal(isQuietHour(at("2026-09-26T06:59:59Z"), DEFAULT_SENDER_PACING), true);
  assert.equal(isQuietHour(at("2026-09-26T07:00:00Z"), DEFAULT_SENDER_PACING), false);
});

test("quiet hours follow the account's time zone", () => {
  const plusOne = { ...DEFAULT_SENDER_PACING, timeZone: "Africa/Porto-Novo" };
  // 20:30 UTC is 21:30 in UTC+1.
  assert.equal(isQuietHour(at("2026-09-25T20:30:00Z"), plusOne), true);
  assert.equal(isQuietHour(at("2026-09-25T20:30:00Z"), DEFAULT_SENDER_PACING), false);
});

test("a quiet window within one day and an empty window are both honoured", () => {
  const lunch = { quietHoursStart: 12, quietHoursEnd: 14, timeZone: "UTC" };
  assert.equal(isQuietHour(at("2026-09-25T13:00:00Z"), lunch), true);
  assert.equal(isQuietHour(at("2026-09-25T22:00:00Z"), lunch), false);
  assert.equal(isQuietHour(at("2026-09-25T22:00:00Z"), { quietHoursStart: 0, quietHoursEnd: 0, timeZone: "UTC" }), false);
});

test("the quiet window ends at the next local resume hour", () => {
  assert.equal(quietHoursEndAt(at("2026-09-25T22:15:30Z"), DEFAULT_SENDER_PACING).toISOString(), "2026-09-26T07:00:00.000Z");
  assert.equal(quietHoursEndAt(at("2026-09-26T03:45:00Z"), DEFAULT_SENDER_PACING).toISOString(), "2026-09-26T07:00:00.000Z");
  const plusOne = { ...DEFAULT_SENDER_PACING, timeZone: "Africa/Porto-Novo" };
  assert.equal(quietHoursEndAt(at("2026-09-25T22:00:00Z"), plusOne).toISOString(), "2026-09-26T06:00:00.000Z");
});

test("the daily count restarts at local midnight", () => {
  assert.equal(localDayStart(at("2026-09-25T16:20:00.500Z"), "Africa/Abidjan").toISOString(), "2026-09-25T00:00:00.000Z");
  assert.equal(localDayStart(at("2026-09-25T23:30:00Z"), "Africa/Porto-Novo").toISOString(), "2026-09-25T23:00:00.000Z");
});

test("first contacts stop at the daily limit, 40 by default", () => {
  assert.equal(hasConsentRequestBudget(39, DEFAULT_SENDER_PACING), true);
  assert.equal(hasConsentRequestBudget(40, DEFAULT_SENDER_PACING), false);
  assert.equal(hasConsentRequestBudget(0, { dailyConsentRequestLimit: 0 }), false);
});

test("an invalid stored configuration falls back to the defaults", () => {
  assert.deepEqual(effectiveSenderPacing(null), DEFAULT_SENDER_PACING);
  assert.deepEqual(
    effectiveSenderPacing({ dailyConsentRequestLimit: -1, quietHoursStart: 25, quietHoursEnd: 6, timeZone: "Mars/Olympus" }),
    { ...DEFAULT_SENDER_PACING, quietHoursEnd: 6 },
  );
  assert.equal(effectiveSenderPacing({ dailyConsentRequestLimit: 10 }).dailyConsentRequestLimit, 10);
});
