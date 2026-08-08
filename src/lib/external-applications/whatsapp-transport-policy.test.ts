import assert from "node:assert/strict";
import { test } from "node:test";

import {
  renderWhatsAppTextTemplate,
  requiresWhatsAppServiceWindow,
  // @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
} from "./whatsapp-transport-policy.ts";

const MISSING = { ok: false, reason: "missing_parameter", rejectionCode: "whatsapp_template_parameter_missing" };
const UNUSED = { ok: false, reason: "unused_parameter", rejectionCode: "whatsapp_template_parameter_unused" };
const INVALID = { ok: false, reason: "invalid_placeholder", rejectionCode: "whatsapp_template_placeholder_invalid" };
const EMPTY = { ok: false, reason: "empty_body", rejectionCode: "whatsapp_template_body_empty" };

test("a template body is rendered with its parameters substituted in order", () => {
  const rendered = renderWhatsAppTextTemplate("Bonjour {{1}}, la moyenne de {{2}} est {{3}}.", ["Awa", "Kouame", "14,5"]);

  assert.deepEqual(rendered, { ok: true, text: "Bonjour Awa, la moyenne de Kouame est 14,5." });
});

test("a marker repeated in the body reuses the same parameter", () => {
  const rendered = renderWhatsAppTextTemplate("{{1}}, votre releve est pret. Merci {{1}}.", ["Awa"]);

  assert.deepEqual(rendered, { ok: true, text: "Awa, votre releve est pret. Merci Awa." });
});

test("markers may be indexed out of order and padded with spaces", () => {
  const rendered = renderWhatsAppTextTemplate("{{ 2 }} pour {{1}}", ["Awa", "Absence"]);

  assert.deepEqual(rendered, { ok: true, text: "Absence pour Awa" });
});

test("a body without any marker is sent as-is when no parameter is supplied", () => {
  const rendered = renderWhatsAppTextTemplate("Les bulletins sont disponibles.", []);

  assert.deepEqual(rendered, { ok: true, text: "Les bulletins sont disponibles." });
});

test("a marker without a matching parameter is rejected durably", () => {
  const rendered = renderWhatsAppTextTemplate("Bonjour {{1}}, note de {{2}}.", ["Awa"]);

  assert.deepEqual(rendered, MISSING);
});

test("a parameter that no marker consumes is rejected durably", () => {
  const rendered = renderWhatsAppTextTemplate("Bonjour {{1}}.", ["Awa", "Kouame"]);

  assert.deepEqual(rendered, UNUSED);
});

test("a gap in the marker sequence is rejected rather than silently dropping a parameter", () => {
  const rendered = renderWhatsAppTextTemplate("Bonjour {{1}} et {{3}}.", ["Awa", "Kouame", "Yao"]);

  assert.deepEqual(rendered, UNUSED);
});

test("a body carrying no marker but receiving parameters is rejected", () => {
  const rendered = renderWhatsAppTextTemplate("Les bulletins sont disponibles.", ["Awa"]);

  assert.deepEqual(rendered, UNUSED);
});

for (const body of ["Bonjour {{0}}.", "Bonjour {{nom}}.", "Bonjour {{1}} et {{2.", "Bonjour }} {{1}}."]) {
  test(`a malformed marker is rejected: ${body}`, () => {
    assert.deepEqual(renderWhatsAppTextTemplate(body, ["Awa"]), INVALID);
  });
}

test("a parameter value carrying template syntax never reaches the recipient", () => {
  const rendered = renderWhatsAppTextTemplate("Solde: {{1}}", ["{{2}} FCFA"]);

  assert.deepEqual(rendered, INVALID);
});

test("a parameter value is substituted verbatim and is not re-scanned for markers", () => {
  const rendered = renderWhatsAppTextTemplate("{{1}} / {{2}}", ["100%", "50 $"]);

  assert.deepEqual(rendered, { ok: true, text: "100% / 50 $" });
});

test("an empty template body is rejected instead of sending a blank message", () => {
  assert.deepEqual(renderWhatsAppTextTemplate("   ", []), EMPTY);
});

test("a body reduced to nothing once substituted is rejected", () => {
  assert.deepEqual(renderWhatsAppTextTemplate("{{1}}", [" "]), EMPTY);
});

test("only Meta free-form text is gated behind the 24h service window", () => {
  // WhatsApp Web has no service window, so gating Baileys would drop replies the
  // transport would have delivered.
  assert.equal(requiresWhatsAppServiceWindow("meta", "text"), true);
  assert.equal(requiresWhatsAppServiceWindow("meta", "template"), false);
  assert.equal(requiresWhatsAppServiceWindow("baileys", "text"), false);
  assert.equal(requiresWhatsAppServiceWindow("baileys", "template"), false);
});
