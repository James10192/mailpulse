import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CHANGE_THRESHOLDS,
  ORGANIZATION_SENDER,
  compare,
  countBySender,
  countOutcomes,
  detectChanges,
  emptyCounts,
  healthOf,
  messageOutcome,
  operationOutcome,
  organizationWhatsAppAvailable,
  overviewWindows,
  readOverviewPeriod,
  settledOf,
  successRate,
  type OutcomeCounts,
} from "./overview-metrics";

function counts(partial: Partial<OutcomeCounts>): OutcomeCounts {
  return { ...emptyCounts(), ...partial };
}

test("every outbound operation status written in the code has an outcome", () => {
  const sources = ["commands.ts", "consent-hold.ts", "consent-inbound.ts", "message-status.ts", "command-submission.ts"]
    .map((file) => readFileSync(new URL(`../external-applications/${file}`, import.meta.url), "utf8"))
    .join("\n");
  const known = ["PENDING", "PROCESSING", "SUBMISSION_UNKNOWN", "QUEUED", "CONSENT_PENDING", "ACCEPTED", "DELIVERED", "READ", "REJECTED", "FAILED"];
  for (const status of known) assert.ok(sources.includes(`"${status}"`), `${status} n'est plus écrit : la table est à revoir`);
  assert.equal(operationOutcome("ACCEPTED"), "sent");
  assert.equal(operationOutcome("READ"), "delivered");
  assert.equal(operationOutcome("REJECTED"), "failed");
  assert.equal(operationOutcome("CONSENT_PENDING"), "pending");
  assert.equal(operationOutcome("DUPLICATE_CONFIRMED"), "closed");
});

test("an unknown status is pending, never dropped", () => {
  assert.equal(operationOutcome("SOMETHING_NEW"), "pending");
  assert.equal(messageOutcome("SOMETHING_NEW"), "pending");
  const total = countOutcomes([{ status: "SOMETHING_NEW", count: 4 }], operationOutcome);
  assert.equal(total.pending, 4);
});

test("both rails add up in the same counts", () => {
  const merged = countOutcomes([{ status: "ACCEPTED", count: 2 }], operationOutcome, countOutcomes([{ status: "SENT", count: 3 }, { status: "TEMPLATE_REQUIRED", count: 1 }], messageOutcome));
  assert.deepEqual(merged, counts({ sent: 5, failed: 1 }));
});

test("success rate ignores pending and cancelled, and is null when nothing settled", () => {
  assert.equal(successRate(counts({ pending: 50, closed: 3 })), null);
  assert.equal(successRate(counts({ delivered: 6, sent: 2, failed: 2, pending: 100 })), 0.8);
  assert.equal(settledOf(counts({ delivered: 1, sent: 1, failed: 1, pending: 9, closed: 9 })), 3);
});

test("comparison has no change without a previous value", () => {
  assert.deepEqual(compare(10, null), { current: 10, previous: null, change: null });
  assert.deepEqual(compare(10, 0), { current: 10, previous: 0, change: null });
  assert.equal(compare(15, 10).change, 0.5);
  assert.equal(compare(5, 10).change, -0.5);
});

test("health follows the documented thresholds", () => {
  assert.equal(healthOf(counts({}), { available: false }), "unavailable");
  assert.equal(healthOf(counts({ pending: 4 })), "idle");
  assert.equal(healthOf(counts({ delivered: 95, failed: 5 })), "healthy");
  assert.equal(healthOf(counts({ delivered: 80, failed: 20 })), "degraded");
  assert.equal(healthOf(counts({ delivered: 79, failed: 21 })), "failing");
});

test("a small sample is at worst degraded", () => {
  assert.equal(healthOf(counts({ delivered: 1, failed: 2 })), "degraded");
  assert.equal(healthOf(counts({ delivered: 3, failed: 7 })), "failing");
});

test("a disabled sender is unavailable even with good history", () => {
  assert.equal(healthOf(counts({ delivered: 500 }), { available: false }), "unavailable");
});

test("senders: a registry message without account is the organization's number", () => {
  const bySender = countBySender(
    [
      { senderKey: null, status: "DELIVERED", count: 3 },
      { senderKey: "acc_1", status: "FAILED", count: 1 },
    ],
    [
      { senderKey: "acc_1", status: "ACCEPTED", count: 2 },
      { senderKey: "acc_2", status: "REJECTED", count: 4 },
    ],
  );
  assert.deepEqual(bySender.get(ORGANIZATION_SENDER), counts({ delivered: 3 }));
  assert.deepEqual(bySender.get("acc_1"), counts({ sent: 2, failed: 1 }));
  assert.deepEqual(bySender.get("acc_2"), counts({ failed: 4 }));
});

test("changes: a failure rate rise is reported only on enough messages", () => {
  const previous = counts({ delivered: 95, failed: 5 });
  const risen = detectChanges({ current: counts({ delivered: 85, failed: 15 }), previous, currentFailures: [], previousFailures: [] });
  assert.equal(risen.length, 1);
  assert.equal(risen[0].kind, "failure_rate");
  assert.match(risen[0].message, /5\s?% à 15\s?%/);

  const tiny = detectChanges({ current: counts({ delivered: 5, failed: 5 }), previous, currentFailures: [], previousFailures: [] });
  assert.equal(tiny.filter((change) => change.kind === "failure_rate").length, 0);
});

test("changes: a volume drop needs a meaningful previous period", () => {
  const drop = detectChanges({ current: counts({ delivered: 10 }), previous: counts({ delivered: 40 }), currentFailures: [], previousFailures: [] });
  assert.deepEqual(drop.map((change) => change.kind), ["volume_drop"]);
  const small = detectChanges({ current: counts({ delivered: 1 }), previous: counts({ delivered: CHANGE_THRESHOLDS.minPreviousVolume - 1 }), currentFailures: [], previousFailures: [] });
  assert.deepEqual(small, []);
});

test("changes: a failure reason is new only if absent before and frequent enough", () => {
  const changes = detectChanges({
    current: counts({}),
    previous: null,
    currentFailures: [{ label: "Modèle non approuvé", count: 3 }, { label: "Refus du fournisseur", count: 9 }, { label: "Rare", count: 2 }],
    previousFailures: [{ label: "Refus du fournisseur", count: 1 }],
  });
  assert.deepEqual(changes.map((change) => change.message), ["Nouvelle cause d'échec : Modèle non approuvé (3)."]);
  const several = detectChanges({
    current: counts({}),
    previous: null,
    currentFailures: [{ label: "A", count: 5 }, { label: "B", count: 4 }],
    previousFailures: [],
  });
  assert.deepEqual(several.map((change) => change.message), ["Nouvelles causes d'échec : A (5), B (4)."]);
});

test("changes: nothing is compared without a previous period", () => {
  assert.deepEqual(detectChanges({ current: counts({ failed: 100 }), previous: null, currentFailures: [], previousFailures: null }), []);
});

test("windows: the previous period has the same length and ends where the current starts", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const windows = overviewWindows("7d", now);
  assert.equal(windows.current.to, now);
  assert.equal(windows.previous.to.getTime(), windows.current.from.getTime());
  assert.equal(windows.current.to.getTime() - windows.current.from.getTime(), windows.previous.to.getTime() - windows.previous.from.getTime());
  assert.equal(readOverviewPeriod("24h"), "24h");
  assert.equal(readOverviewPeriod("all"), "7d");
  assert.equal(readOverviewPeriod(undefined), "7d");
});

test("organization number: configured, connected, and enabled", () => {
  const base = { whatsappEnabled: true, whatsappMode: "BAILEYS" as const, evoInstanceName: "mp-1", evoInstanceStatus: "open", metaPhoneNumberId: null, metaAccessToken: null };
  assert.equal(organizationWhatsAppAvailable(base), true);
  assert.equal(organizationWhatsAppAvailable({ ...base, evoInstanceStatus: null }), true);
  assert.equal(organizationWhatsAppAvailable({ ...base, evoInstanceStatus: "connecting" }), false);
  assert.equal(organizationWhatsAppAvailable({ ...base, whatsappEnabled: false }), false);
  assert.equal(organizationWhatsAppAvailable({ ...base, evoInstanceName: null }), false);
  assert.equal(organizationWhatsAppAvailable({ ...base, whatsappMode: "META" }), false);
  assert.equal(organizationWhatsAppAvailable({ ...base, whatsappMode: "META", metaPhoneNumberId: "1", metaAccessToken: "t" }), true);
});
