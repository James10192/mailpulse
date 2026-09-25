import assert from "node:assert/strict";
import { test } from "node:test";

import { parseDocumentContent } from "./whatsapp-document";

const VALID = { url: "https://files.example.com/report.pdf", filename: "report.pdf", mimeType: "application/pdf" };

test("a valid document keeps its real name, type and caption", () => {
  assert.deepEqual(parseDocumentContent({ ...VALID, caption: " Votre document " }), {
    type: "document",
    url: VALID.url,
    filename: "report.pdf",
    mimeType: "application/pdf",
    caption: "Votre document",
  });
});

test("an empty caption is dropped rather than sent blank", () => {
  assert.equal(parseDocumentContent({ ...VALID, caption: "   " })?.caption, undefined);
});

test("only HTTPS URLs without embedded credentials are accepted", () => {
  assert.equal(parseDocumentContent({ ...VALID, url: "http://files.example.com/report.pdf" }), null);
  assert.equal(parseDocumentContent({ ...VALID, url: "https://user:secret@files.example.com/r.pdf" }), null);
  assert.equal(parseDocumentContent({ ...VALID, url: "not a url" }), null);
});

test("a filename with a path separator or over 120 characters is refused", () => {
  assert.equal(parseDocumentContent({ ...VALID, filename: "../report.pdf" }), null);
  assert.equal(parseDocumentContent({ ...VALID, filename: "dir\\report.pdf" }), null);
  assert.equal(parseDocumentContent({ ...VALID, filename: `${"a".repeat(117)}.pdf` }), null);
  assert.ok(parseDocumentContent({ ...VALID, filename: `${"a".repeat(116)}.pdf` }));
  assert.equal(parseDocumentContent({ ...VALID, filename: "  " }), null);
});

test("only allow-listed media types are accepted", () => {
  assert.ok(parseDocumentContent({ ...VALID, mimeType: "image/jpeg" }));
  assert.ok(parseDocumentContent({ ...VALID, mimeType: "IMAGE/PNG" }));
  assert.equal(parseDocumentContent({ ...VALID, mimeType: "application/zip" }), null);
  assert.equal(parseDocumentContent({ ...VALID, mimeType: "text/html" }), null);
});

test("a caption over 1024 characters is refused", () => {
  assert.ok(parseDocumentContent({ ...VALID, caption: "a".repeat(1024) }));
  assert.equal(parseDocumentContent({ ...VALID, caption: "a".repeat(1025) }), null);
});
