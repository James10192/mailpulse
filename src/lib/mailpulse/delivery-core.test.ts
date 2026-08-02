import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { applyStopPreference, canReceiveChannel, isStopCommand } from "./consent.ts";
// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { compileMetaTemplateDispatch } from "./template-parameters.ts";

test("STOP only disables the receiving channel and is idempotent", () => {
  const once = applyStopPreference({ channel_opt_in: { sms: true } }, "SMS");
  const twice = applyStopPreference(once, "SMS");

  assert.deepEqual(twice, { channel_opt_in: { sms: false } });
  assert.equal(canReceiveChannel({ subscribed: true, metadata: twice }, "SMS"), false);
  assert.equal(canReceiveChannel({ subscribed: true, metadata: twice }, "EMAIL"), true);
  assert.equal(isStopCommand(" STOP! "), true);
  assert.equal(isStopCommand("stop now"), false);
});

test("Meta template parameters follow the template declaration, not request key order", () => {
  const dispatch = compileMetaTemplateDispatch(
    {
      providerTemplateId: "meta_appointment_v3",
      variables: { first_name: {}, appointment_date: {} },
      metadata: null,
    },
    { appointment_date: "12/08", first_name: "Awa" },
  );

  assert.deepEqual(dispatch, {
    providerTemplateId: "meta_appointment_v3",
    parameters: ["Awa", "12/08"],
  });
});

test("Meta dispatch rejects absent provider IDs and required values", () => {
  assert.throws(
    () => compileMetaTemplateDispatch({ providerTemplateId: null, variables: {}, metadata: null }, {}),
    /identifiant fournisseur/,
  );
  assert.throws(
    () => compileMetaTemplateDispatch({ providerTemplateId: "meta", variables: { code: {} }, metadata: null }, {}),
    /variable de modèle/,
  );
});
