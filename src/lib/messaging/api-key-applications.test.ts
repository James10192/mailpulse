import assert from "node:assert/strict";
import test from "node:test";

import { planApplicationsForKeys, slugifyApplicationKey } from "./api-key-applications";

test("keys sharing a name become one application", () => {
  const plan = planApplicationsForKeys([
    { id: "k1", name: "KLASSCI esbtp-abidjan", defaultEmailSenderId: "s1" },
    { id: "k2", name: "klassci  ESBTP-abidjan ", defaultEmailSenderId: "s1" },
    { id: "k3", name: "Klassci esbtp-yakro", defaultEmailSenderId: null },
  ], []);

  assert.deepEqual(plan.map((application) => [application.key, application.apiKeyIds]), [
    ["klassci-esbtp-abidjan", ["k1", "k2"]],
    ["klassci-esbtp-yakro", ["k3"]],
  ]);
  assert.equal(plan[0].defaultEmailSenderId, "s1");
});

test("an email sender the keys disagree on stays on each key", () => {
  const [application] = planApplicationsForKeys([
    { id: "k1", name: "App", defaultEmailSenderId: "s1" },
    { id: "k2", name: "App", defaultEmailSenderId: null },
  ], []);
  assert.equal(application.defaultEmailSenderId, null);
});

test("an existing application key is never reused", () => {
  const plan = planApplicationsForKeys([
    { id: "k1", name: "klassci", defaultEmailSenderId: null },
    { id: "k2", name: "Klassci!", defaultEmailSenderId: null },
  ], ["klassci"]);
  assert.deepEqual(plan.map((application) => application.key), ["klassci-2", "klassci-3"]);
});

test("application keys follow the dashboard's pattern", () => {
  assert.equal(slugifyApplicationKey("École Saint-Augustin — Yamoussoukro"), "ecole-saint-augustin-yamoussoukro");
  assert.equal(slugifyApplicationKey("***"), "application");
  assert.match(slugifyApplicationKey("x".repeat(100)), /^[a-z0-9][a-z0-9._-]{1,63}$/);
});
