import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyConsentReply,
  consentStateAfterReply,
  isConsentBlocking,
  normalizeConsentReply,
} from "./consent-policy";

test("a reply is upper-cased, stripped of accents, punctuation and spaces", () => {
  assert.equal(normalizeConsentReply("  d'accord ! "), "DACCORD");
  assert.equal(normalizeConsentReply("Arrêt."), "ARRET");
  assert.equal(normalizeConsentReply("J’accepte"), "JACCEPTE");
  assert.equal(normalizeConsentReply("dé-sa-bon-ner"), "DESABONNER");
});

test("every agreed word grants consent", () => {
  for (const text of ["oui", "Yes", "ok", "D'accord", "j'accepte", "OUI !"]) {
    assert.equal(classifyConsentReply(text), "grant", text);
  }
});

test("every refusal word refuses consent", () => {
  for (const text of ["non", "No", "STOP", "arrêt", "Stopper", "désabonner"]) {
    assert.equal(classifyConsentReply(text), "refuse", text);
  }
});

test("a sentence that merely contains a keyword is not an answer", () => {
  assert.equal(classifyConsentReply("non merci, oui plus tard"), null);
  assert.equal(classifyConsentReply("okay"), null);
  assert.equal(classifyConsentReply("Bonjour"), null);
  assert.equal(classifyConsentReply(""), null);
});

test("a yes reactivates and a no refuses, whatever came before", () => {
  assert.equal(consentStateAfterReply("grant"), "GRANTED");
  assert.equal(consentStateAfterReply("refuse"), "REFUSED");
});

test("only a refusal blocks commands", () => {
  assert.equal(isConsentBlocking("REFUSED"), true);
  for (const status of ["PENDING", "GRANTED", "EXPIRED", null, undefined] as const) {
    assert.equal(isConsentBlocking(status), false, String(status));
  }
});
