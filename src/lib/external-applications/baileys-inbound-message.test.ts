import assert from "node:assert/strict";
import { test } from "node:test";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { getInboundTextMessages } from "./baileys-inbound-message.ts";

const NOW = new Date("2026-08-08T10:00:00.000Z");

function upsert(data: unknown, event = "messages.upsert") {
  return { event, instance: "school-abidjan", data };
}

function directMessage(overrides: Record<string, unknown> = {}) {
  return {
    key: { remoteJid: "2250707123456@s.whatsapp.net", fromMe: false, id: "3EB0ABC" },
    message: { conversation: "NOTES" },
    messageTimestamp: 1770544800,
    ...overrides,
  };
}

test("a direct text message becomes an inbound message with an E.164 sender", () => {
  const [message] = getInboundTextMessages(upsert(directMessage()), NOW);

  assert.equal(message.sender, "+2250707123456");
  assert.equal(message.text, "NOTES");
  assert.equal(message.providerMessageId, "3EB0ABC");
  assert.equal(message.occurredAt.getTime(), 1770544800 * 1000);
});

test("our own echoed messages are ignored so the chatbot cannot answer itself", () => {
  const echoed = directMessage({ key: { remoteJid: "2250707123456@s.whatsapp.net", fromMe: true, id: "3EB0SELF" } });

  assert.deepEqual(getInboundTextMessages(upsert(echoed), NOW), []);
});

test("group and broadcast chats are ignored", () => {
  for (const remoteJid of ["120363000000000000@g.us", "status@broadcast"]) {
    const entry = directMessage({ key: { remoteJid, fromMe: false, id: "3EB0GRP" } });
    assert.deepEqual(getInboundTextMessages(upsert(entry), NOW), []);
  }
});

test("a quoted reply is read from extendedTextMessage", () => {
  const reply = directMessage({ message: { extendedTextMessage: { text: "OUI" } } });

  assert.equal(getInboundTextMessages(upsert(reply), NOW)[0].text, "OUI");
});

test("non-text messages carry no command and are dropped", () => {
  const media = directMessage({ message: { imageMessage: { caption: "OUI" } } });

  assert.deepEqual(getInboundTextMessages(upsert(media), NOW), []);
});

test("data is accepted as an array as well as an object", () => {
  const batch = getInboundTextMessages(upsert([directMessage(), directMessage({ key: { remoteJid: "2250505999999@s.whatsapp.net", fromMe: false, id: "3EB0TWO" } })]), NOW);

  assert.equal(batch.length, 2);
  assert.equal(batch[1].sender, "+2250505999999");
});

test("events other than messages.upsert are ignored", () => {
  assert.deepEqual(getInboundTextMessages(upsert(directMessage(), "connection.update"), NOW), []);
});

test("a missing or unusable timestamp falls back to now instead of dropping the message", () => {
  const undated = getInboundTextMessages(upsert(directMessage({ messageTimestamp: undefined })), NOW)[0];

  assert.equal(undated.occurredAt.getTime(), NOW.getTime());
});

test("a timestamp sent as a string is parsed", () => {
  const message = getInboundTextMessages(upsert(directMessage({ messageTimestamp: "1770544800" })), NOW)[0];

  assert.equal(message.occurredAt.getTime(), 1770544800 * 1000);
});

test("a companion device suffix is dropped instead of folded into the number", () => {
  const fromDevice = directMessage({ key: { remoteJid: "2250707123456:12@s.whatsapp.net", fromMe: false, id: "3EB0DEV" } });

  assert.equal(getInboundTextMessages(upsert(fromDevice), NOW)[0].sender, "+2250707123456");
});

test("an implausible sender is rejected rather than normalised into a fake number", () => {
  for (const remoteJid of ["0707123456@s.whatsapp.net", "abc@s.whatsapp.net", "@s.whatsapp.net"]) {
    const entry = directMessage({ key: { remoteJid, fromMe: false, id: "3EB0BAD" } });
    assert.deepEqual(getInboundTextMessages(upsert(entry), NOW), []);
  }
});

test("a linked id resolves the parent through its companion phone field", () => {
  const linked = directMessage({ key: { remoteJid: "184700000000000@lid", fromMe: false, id: "3EB0LID" }, senderPn: "2250707123456@s.whatsapp.net" });

  assert.equal(getInboundTextMessages(upsert(linked), NOW)[0].sender, "+2250707123456");
});

test("a linked id without a companion phone is dropped rather than guessed", () => {
  const linked = directMessage({ key: { remoteJid: "184700000000000@lid", fromMe: false, id: "3EB0LID2" } });

  assert.deepEqual(getInboundTextMessages(upsert(linked), NOW), []);
});

test("a disappearing message is unwrapped instead of being ignored", () => {
  const ephemeral = directMessage({ message: { ephemeralMessage: { message: { conversation: "ABSENCES" } } } });

  assert.equal(getInboundTextMessages(upsert(ephemeral), NOW)[0].text, "ABSENCES");
});

test("an out of range timestamp falls back to now instead of opening an absurd window", () => {
  for (const messageTimestamp of [1, 99999999999999]) {
    const entry = directMessage({ messageTimestamp });
    assert.equal(getInboundTextMessages(upsert(entry), NOW)[0].occurredAt.getTime(), NOW.getTime());
  }
});

test("milliseconds are detected so the window does not expire centuries away", () => {
  const inMilliseconds = directMessage({ messageTimestamp: 1770544800000 });

  assert.equal(getInboundTextMessages(upsert(inMilliseconds), NOW)[0].occurredAt.getTime(), 1770544800 * 1000);
});

test("a batch is capped so one request cannot exhaust the function", () => {
  const flood = Array.from({ length: 250 }, (_unused, index) =>
    directMessage({ key: { remoteJid: "2250707123456@s.whatsapp.net", fromMe: false, id: `3EB0${index}` } }));

  assert.equal(getInboundTextMessages(upsert(flood), NOW).length, 100);
});

test("malformed payloads never throw", () => {
  for (const payload of [null, undefined, "", 42, {}, { data: null }, { data: { key: null } }]) {
    assert.deepEqual(getInboundTextMessages(payload, NOW), []);
  }
});
