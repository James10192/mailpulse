import assert from "node:assert/strict";
import test from "node:test";
import type { AutomationStatus } from "@/generated/prisma";
import {
  WORKFLOW_MAX_NODES,
  deleteOrganizationAutomation,
  findOrganizationAutomation,
  parseAutomationStatus,
  parseWorkflowPayload,
  replaceOrganizationWorkflow,
  setOrganizationAutomationStatus,
  type AutomationScopedDb,
} from "./tenant-scope";

type Automation = { id: string; organizationId: string; name: string; status: AutomationStatus; userId: string };
type Step = { automationId: string; type: string; position: number; config: unknown };

/** In-memory stand-in applying exactly the `where` filters the helpers send. */
function createDb() {
  const automations: Automation[] = [
    { id: "auto-a", organizationId: "org-a", name: "Bienvenue A", status: "DRAFT", userId: "user-a" },
    { id: "auto-b", organizationId: "org-b", name: "Bienvenue B", status: "ACTIVE", userId: "user-b" },
  ];
  const steps: Step[] = [
    { automationId: "auto-a", type: "trigger", position: 0, config: {} },
    { automationId: "auto-b", type: "trigger", position: 0, config: {} },
    { automationId: "auto-b", type: "email", position: 1, config: {} },
  ];

  const matches = (a: Automation, where: { id?: string; organizationId?: string }) =>
    (where.id === undefined || a.id === where.id) &&
    (where.organizationId === undefined || a.organizationId === where.organizationId);

  const db: AutomationScopedDb = {
    automation: {
      async findFirst({ where }) {
        const found = automations.find((a) => matches(a, where));
        return found ? { name: found.name, status: found.status, userId: found.userId } : null;
      },
      async updateMany({ where, data }) {
        const hits = automations.filter((a) => matches(a, where));
        for (const a of hits) a.status = data.status;
        return { count: hits.length };
      },
      async deleteMany({ where }) {
        const before = automations.length;
        for (let i = automations.length - 1; i >= 0; i--) {
          if (matches(automations[i], where)) automations.splice(i, 1);
        }
        return { count: before - automations.length };
      },
    },
    automationStep: {
      async deleteMany({ where }) {
        const before = steps.length;
        for (let i = steps.length - 1; i >= 0; i--) {
          if (steps[i].automationId === where.automationId) steps.splice(i, 1);
        }
        return { count: before - steps.length };
      },
      async createMany({ data }) {
        steps.push(...data);
        return { count: data.length };
      },
    },
  };

  return { db, automations, steps };
}

const node = (id: string, type = "email") => ({
  id,
  position: { x: 10, y: 20 },
  data: { type, label: id, config: { subject: "Bonjour" } },
});

test("saves the workflow of the caller's own automation", async () => {
  const { db, steps } = createDb();
  const payload = parseWorkflowPayload(
    JSON.stringify([node("n1", "trigger"), node("n2")]),
    JSON.stringify([{ id: "e1", source: "n1", target: "n2" }])
  );
  assert.ok(payload);
  assert.equal(await replaceOrganizationWorkflow(db, "org-a", "auto-a", payload), true);
  const saved = steps.filter((s) => s.automationId === "auto-a");
  assert.deepEqual(saved.map((s) => s.type), ["trigger", "email"]);
});

test("cannot overwrite another organization's workflow, and leaves its steps intact", async () => {
  const { db, steps } = createDb();
  const payload = parseWorkflowPayload(JSON.stringify([node("n1")]), "[]");
  assert.ok(payload);
  assert.equal(await replaceOrganizationWorkflow(db, "org-a", "auto-b", payload), false);
  assert.equal(await replaceOrganizationWorkflow(db, "org-a", "auto-zzz", payload), false);
  assert.equal(steps.filter((s) => s.automationId === "auto-b").length, 2);
});

test("rejects a malformed workflow payload", () => {
  assert.equal(parseWorkflowPayload("{", "[]"), null);
  assert.equal(parseWorkflowPayload(JSON.stringify([{ id: "n1" }]), "[]"), null);
  assert.equal(parseWorkflowPayload("[]", JSON.stringify([{ id: "e1", source: "n1" }])), null);
  const tooMany = Array.from({ length: WORKFLOW_MAX_NODES + 1 }, (_, i) => node(`n${i}`));
  assert.equal(parseWorkflowPayload(JSON.stringify(tooMany), "[]"), null);
});

test("stores the edges on the first step only", () => {
  const payload = parseWorkflowPayload(
    JSON.stringify([node("n1"), node("n2")]),
    JSON.stringify([{ id: "e1", source: "n1", target: "n2", sourceHandle: "yes" }])
  );
  assert.ok(payload);
  assert.deepEqual(payload[0].config._edges, [
    { id: "e1", source: "n1", target: "n2", sourceHandle: "yes", targetHandle: null },
  ]);
  assert.equal("_edges" in payload[1].config, false);
});

test("status values are checked against the enum", () => {
  assert.equal(parseAutomationStatus("ACTIVE"), "ACTIVE");
  assert.equal(parseAutomationStatus("PAUSED"), "PAUSED");
  assert.equal(parseAutomationStatus("active"), null);
  assert.equal(parseAutomationStatus("DELETED"), null);
  assert.equal(parseAutomationStatus(undefined), null);
});

test("changes the status of the caller's automation only", async () => {
  const { db, automations } = createDb();
  assert.equal(await setOrganizationAutomationStatus(db, "org-a", "auto-a", "ACTIVE"), true);
  assert.equal(automations.find((a) => a.id === "auto-a")?.status, "ACTIVE");

  assert.equal(await setOrganizationAutomationStatus(db, "org-a", "auto-b", "PAUSED"), false);
  assert.equal(automations.find((a) => a.id === "auto-b")?.status, "ACTIVE");
});

test("another organization's automation is not visible", async () => {
  const { db } = createDb();
  assert.deepEqual(await findOrganizationAutomation(db, "org-a", "auto-a"), {
    name: "Bienvenue A",
    status: "DRAFT",
    userId: "user-a",
  });
  assert.equal(await findOrganizationAutomation(db, "org-a", "auto-b"), null);
});

test("deletes the caller's automation, never another organization's", async () => {
  const { db, automations } = createDb();
  assert.equal(await deleteOrganizationAutomation(db, "org-a", "auto-b"), null);
  assert.equal(await deleteOrganizationAutomation(db, "org-a", "auto-zzz"), null);
  assert.ok(automations.some((a) => a.id === "auto-b"));

  assert.equal((await deleteOrganizationAutomation(db, "org-a", "auto-a"))?.name, "Bienvenue A");
  assert.equal(automations.some((a) => a.id === "auto-a"), false);
});
