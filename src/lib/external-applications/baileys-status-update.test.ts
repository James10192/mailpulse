import assert from "node:assert/strict";
import { test } from "node:test";

import { getBaileysStatusUpdates } from "./baileys-status-update";

function update(data: unknown, event = "messages.update") {
  return { event, instance: "sender-1", data };
}

test("current Evolution acks map onto the shared statuses", () => {
  const acks = ["SERVER_ACK", "DELIVERY_ACK", "READ", "PLAYED", "ERROR"].map((status) => ({ keyId: `id-${status}`, fromMe: true, status }));
  assert.deepEqual(getBaileysStatusUpdates(update(acks)).map((item) => item.status), ["sent", "delivered", "read", "read", "failed"]);
});

test("the WhatsApp id is read from keyId, not from Evolution's own messageId", () => {
  const [item] = getBaileysStatusUpdates(update({ messageId: "db-row-1", keyId: "3EB0ABC", fromMe: true, status: "DELIVERY_ACK" }));
  assert.equal(item.providerMessageId, "3EB0ABC");
});

test("older payloads with a nested key and numeric codes are understood", () => {
  const [item] = getBaileysStatusUpdates(update({ key: { id: "3EB0DEF", fromMe: true }, update: { status: 4 } }));
  assert.deepEqual(item, { providerMessageId: "3EB0DEF", status: "read" });
});

test("pending acks, the recipient's own messages and other events are ignored", () => {
  assert.deepEqual(getBaileysStatusUpdates(update({ keyId: "a", fromMe: true, status: "PENDING" })), []);
  assert.deepEqual(getBaileysStatusUpdates(update({ keyId: "a", fromMe: false, status: "READ" })), []);
  assert.deepEqual(getBaileysStatusUpdates(update({ keyId: "a", fromMe: true, status: "READ" }, "messages.upsert")), []);
  assert.deepEqual(getBaileysStatusUpdates(update({ fromMe: true, status: "READ" })), []);
  assert.deepEqual(getBaileysStatusUpdates("nope"), []);
});

test("both the dotted and the underscored event names are accepted", () => {
  assert.equal(getBaileysStatusUpdates(update({ keyId: "a", status: "READ" }, "MESSAGES_UPDATE")).length, 1);
});
