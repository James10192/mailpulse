import assert from "node:assert/strict";
import test from "node:test";
import { buildSegmentWhere, parseSegmentFilter, parseSegmentFilterJson } from "./segment-filter";

test("the where clause is always scoped to the organization", () => {
  assert.deepEqual(buildSegmentWhere("org-a", null), { organizationId: "org-a" });
  const where = buildSegmentWhere("org-a", { subscribed: true, includeTags: ["vip"] });
  assert.equal(where.organizationId, "org-a");
  assert.deepEqual(where.tags, { some: { name: { in: ["vip"] } } });
  assert.equal(where.subscribed, true);
});

test("an organization id smuggled into the filter is dropped", () => {
  const parsed = parseSegmentFilter({ organizationId: "org-b", subscribed: false });
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.filter, { subscribed: false });
  assert.equal(buildSegmentWhere("org-a", parsed.filter).organizationId, "org-a");
});

test("builds engagement and date ranges", () => {
  const where = buildSegmentWhere("org-a", {
    engagementMin: 10,
    engagementMax: 80,
    createdAfter: "2026-01-01",
    createdBefore: "2026-06-30",
  });
  assert.deepEqual(where.engagementScore, { gte: 10, lte: 80 });
  assert.deepEqual(where.createdAt, { gte: new Date("2026-01-01"), lte: new Date("2026-06-30") });
});

test("rejects malformed filters instead of guessing", () => {
  assert.deepEqual(parseSegmentFilter({ engagementMin: "10" }), { ok: false });
  assert.deepEqual(parseSegmentFilter({ createdAfter: "pas une date" }), { ok: false });
  assert.deepEqual(parseSegmentFilter({ includeTags: "vip" }), { ok: false });
  assert.deepEqual(parseSegmentFilter("subscribed"), { ok: false });
  assert.deepEqual(parseSegmentFilterJson("{not json"), { ok: false });
});

test("no filter means every contact of the organization", () => {
  assert.deepEqual(parseSegmentFilter(null), { ok: true, filter: null });
  assert.deepEqual(parseSegmentFilterJson(""), { ok: true, filter: null });
  assert.deepEqual(parseSegmentFilterJson(undefined), { ok: true, filter: null });
});
