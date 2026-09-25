import assert from "node:assert/strict";
import { test } from "node:test";

import { parseExternalCommandRequest } from "./command-request";

const DOCUMENT = { type: "document", url: "https://files.example.com/a.pdf", filename: "a.pdf", mimeType: "application/pdf" };

function snake(content: unknown, extra: Record<string, unknown> = {}) {
  return {
    operation_key: "notice.sent",
    channel: "whatsapp",
    recipient: { type: "phone", value: "+2250700000000" },
    content,
    metadata: { idempotency_key: "k-1" },
    ...extra,
  };
}

test("the existing snake_case text command still parses unchanged", () => {
  assert.deepEqual(parseExternalCommandRequest(snake({ type: "text", text: " Bonjour " })), {
    operationKey: "notice.sent",
    idempotencyKey: "k-1",
    recipient: "+2250700000000",
    content: { type: "text", text: "Bonjour" },
  });
});

test("the contract's camelCase shape parses to the same command", () => {
  const command = parseExternalCommandRequest({ operationKey: "notice.sent", idempotencyKey: "k-1", recipient: "+2250700000000", content: DOCUMENT });
  assert.equal(command?.content.type, "document");
  assert.equal(command?.recipient, "+2250700000000");
});

test("a document accepts mime_type as well as mimeType", () => {
  const command = parseExternalCommandRequest(snake({ type: "document", url: DOCUMENT.url, filename: "a.pdf", mime_type: "image/png" }));
  assert.deepEqual(command?.content, { type: "document", url: DOCUMENT.url, filename: "a.pdf", mimeType: "image/png" });
});

test("an invalid document is refused as a whole", () => {
  assert.equal(parseExternalCommandRequest(snake({ ...DOCUMENT, url: "http://files.example.com/a.pdf" })), null);
  assert.equal(parseExternalCommandRequest(snake({ ...DOCUMENT, mimeType: "application/zip" })), null);
  assert.equal(parseExternalCommandRequest(snake({ ...DOCUMENT, mimeType: undefined })), null);
});

test("unknown fields are still refused", () => {
  assert.equal(parseExternalCommandRequest(snake({ type: "text", text: "x" }, { extra: true })), null);
  assert.equal(parseExternalCommandRequest(snake({ type: "text", text: "x", extra: true })), null);
});
