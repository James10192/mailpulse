import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyConsentReply,
  consentGateDecision,
  consentStateAfterReply,
  consentTtlSeconds,
  isConsentBlocking,
  isConsumedConsentReply,
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

test("the consent expiry defaults to 48 h and is brought back into [1 h, 7 days]", () => {
  assert.equal(consentTtlSeconds(undefined), 172_800);
  assert.equal(consentTtlSeconds(null), 172_800);
  assert.equal(consentTtlSeconds(60), 3_600);
  assert.equal(consentTtlSeconds(10_000_000), 604_800);
  assert.equal(consentTtlSeconds(7_200.9), 7_200);
});

test("a command is sent, held behind a new request, joined to a pending one or refused", () => {
  assert.equal(consentGateDecision(null, false), "send");
  assert.equal(consentGateDecision("PENDING", false), "send");
  assert.equal(consentGateDecision("GRANTED", true), "send");
  assert.equal(consentGateDecision(null, true), "request");
  assert.equal(consentGateDecision("EXPIRED", true), "request");
  assert.equal(consentGateDecision("PENDING", true), "join");
  // A refusal holds with or without a consent request.
  assert.equal(consentGateDecision("REFUSED", false), "refuse");
  assert.equal(consentGateDecision("REFUSED", true), "refuse");
});

test("a reply is consumed only when it answers a request that was actually sent", () => {
  const sentAt = new Date("2026-09-25T10:00:00Z");
  assert.equal(isConsumedConsentReply({ status: "PENDING", requestSentAt: sentAt }), true);
  // Written before the request left: it decides, but it is still forwarded.
  assert.equal(isConsumedConsentReply({ status: "PENDING", requestSentAt: null }), false);
  // No pending request: an ordinary message, whatever it says.
  assert.equal(isConsumedConsentReply({ status: "GRANTED", requestSentAt: sentAt }), false);
  assert.equal(isConsumedConsentReply({ status: "EXPIRED", requestSentAt: sentAt }), false);
  assert.equal(isConsumedConsentReply(null), false);
});
