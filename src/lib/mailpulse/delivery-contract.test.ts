import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { applyStopPreference, canReceiveChannel, isStopCommand } from "./consent.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { compileMetaTemplateDispatch } from "./template-parameters.ts";

test("STOP only disables its channel and remains idempotent", () => {
  const metadata = applyStopPreference(applyStopPreference({}, "SMS"), "SMS");
  assert.equal(canReceiveChannel({ subscribed: true, metadata }, "SMS"), false);
  assert.equal(canReceiveChannel({ subscribed: true, metadata }, "EMAIL"), true);
  assert.equal(isStopCommand(" STOP! "), true);
});

test("Meta dispatch uses provider ID and template-defined variable order", () => {
  const dispatch = compileMetaTemplateDispatch(
    { providerTemplateId: "meta_appointment_v3", variables: { first_name: {}, appointment_date: {} }, metadata: null },
    { appointment_date: "12/08", first_name: "Awa" },
  );
  assert.deepEqual(dispatch, { providerTemplateId: "meta_appointment_v3", parameters: ["Awa", "12/08"] });
});

test("Meta dispatch rejects missing provider IDs and values", () => {
  assert.throws(() => compileMetaTemplateDispatch({ providerTemplateId: null, variables: {}, metadata: null }, {}));
  assert.throws(() => compileMetaTemplateDispatch({ providerTemplateId: "meta", variables: { code: {} }, metadata: null }, {}));
});
