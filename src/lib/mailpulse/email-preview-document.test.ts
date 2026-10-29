import assert from "node:assert/strict";
import test from "node:test";
import { resolveEmailPreview } from "./email-preview-document";

test("HTML supplied by KLASSCI is retained as the recorded version", () => {
  assert.deepEqual(resolveEmailPreview({ email_html: "<h1>Annonce</h1>" }, "fallback"), {
    kind: "html", html: "<h1>Annonce</h1>",
  });
});

test("text-only historic messages have an escaped preview, not invented branding", () => {
  const preview = resolveEmailPreview(null, "Bonjour\n<img src=x onerror=alert(1)> & 'école'");
  assert.equal(preview?.kind, "text");
  assert.ok(preview?.html.includes("white-space:pre-wrap"));
  assert.ok(preview?.html.includes("&lt;img"));
  assert.ok(preview?.html.includes("&amp;"));
  assert.equal(preview?.html.includes("<img"), false);
  assert.equal(preview?.html.includes("KLASSCI"), false);
});

test("empty and unsupported messages do not render an iframe", () => {
  assert.equal(resolveEmailPreview({}, null), null);
  assert.equal(resolveEmailPreview({ email_html: "" }, ""), null);
});

test("oversized stored HTML is ignored in favor of safe text fallback", () => {
  assert.equal(resolveEmailPreview({ email_html: "x".repeat(500_001) }, "fallback")?.kind, "text");
});
