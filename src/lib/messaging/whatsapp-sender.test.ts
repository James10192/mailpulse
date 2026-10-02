import assert from "node:assert/strict";
import test from "node:test";

process.env.EXTERNAL_APPLICATION_KEK = Buffer.alloc(32, 7).toString("base64");

const { encryptExternalApplicationValue } = await import("../external-applications/crypto");
const {
  accountSnapshot,
  messageRouting,
  summarizeWhatsAppSender,
  chooseWhatsAppSender,
  organizationSnapshot,
  providerConfigForAccount,
  senderSnapshotLabel,
} = await import("./whatsapp-sender");

type Account = Parameters<typeof chooseWhatsAppSender>[0][number];

function baileys(overrides: Partial<Account> = {}): Account {
  return {
    id: "pa-yakro",
    provider: "BAILEYS_WHATSAPP",
    active: true,
    label: "ESBTP Yakro",
    senderId: "2250700000002",
    externalAccountId: "mp-yakro",
    credentialsCiphertext: null,
    ...overrides,
  };
}

function meta(overrides: Partial<Account> = {}): Account {
  return {
    id: "pa-abidjan",
    provider: "META_WHATSAPP",
    active: true,
    label: "ESBTP Abidjan",
    senderId: "1098765432",
    externalAccountId: "waba-1",
    credentialsCiphertext: encryptExternalApplicationValue(JSON.stringify({ accessToken: "tok", appSecret: "s", verifyToken: "v" })),
    ...overrides,
  };
}

test("an application without any number sends from the organization's", () => {
  assert.deepEqual(chooseWhatsAppSender([]), { kind: "organization" });
});

test("an application sends from its one active number", () => {
  const account = baileys();
  assert.deepEqual(chooseWhatsAppSender([account, baileys({ id: "old", active: false })]), { kind: "account", account });
});

test("a disabled number is unavailable, never replaced by the organization's", () => {
  assert.deepEqual(chooseWhatsAppSender([baileys({ active: false })]), { kind: "unavailable" });
});

test("two active numbers are ambiguous and refused", () => {
  assert.deepEqual(chooseWhatsAppSender([baileys(), meta()]), { kind: "unavailable" });
});

test("a Baileys account sends through its Evolution instance", () => {
  assert.deepEqual(providerConfigForAccount(baileys()), { mode: "BAILEYS", instanceName: "mp-yakro" });
});

test("a Meta account sends with its phone number id and decrypted token", () => {
  assert.deepEqual(providerConfigForAccount(meta()), { mode: "META", phoneNumberId: "1098765432", accessToken: "tok" });
});

test("an account that cannot send yields no configuration", () => {
  assert.equal(providerConfigForAccount(baileys({ active: false })), null);
  assert.equal(providerConfigForAccount(baileys({ externalAccountId: "" })), null);
  assert.equal(providerConfigForAccount(meta({ credentialsCiphertext: null })), null);
  assert.equal(providerConfigForAccount(meta({ credentialsCiphertext: "v1.damaged" })), null);
});

test("the snapshot names the number the message left from", () => {
  assert.deepEqual(accountSnapshot(baileys()), {
    source: "application",
    provider: "EVOLUTION_API",
    label: "ESBTP Yakro",
    address: "2250700000002",
  });
  assert.deepEqual(organizationSnapshot({ whatsappMode: "META", whatsappPhone: "+22541540178" }), {
    source: "organization",
    provider: "META_CLOUD",
    label: null,
    address: "+22541540178",
  });
});

const ORGANIZATION = { whatsappMode: "BAILEYS" as const, whatsappPhone: "+22541540178" };

test("a message records the application's number, frozen", () => {
  const routing = messageRouting({ kind: "account", account: baileys() }, ORGANIZATION);
  assert.equal(routing.refused, false);
  assert.equal(routing.senderAccountId, "pa-yakro");
  assert.equal(routing.senderSnapshot?.label, "ESBTP Yakro");
});

test("a message for an unavailable number is refused and points at no number", () => {
  const routing = messageRouting({ kind: "unavailable" }, ORGANIZATION);
  assert.equal(routing.refused, true);
  assert.equal(routing.senderAccountId, null);
  assert.equal(routing.senderSnapshot, null);
});

test("a Meta number decides the WhatsApp rules, not the organization's mode", () => {
  assert.equal(messageRouting({ kind: "account", account: meta() }, ORGANIZATION).mode, "META");
});

test("other channels record no WhatsApp identity", () => {
  assert.deepEqual(messageRouting(null, ORGANIZATION), { refused: false, mode: "BAILEYS", senderAccountId: null, senderSnapshot: null });
});

test("with several active numbers the default speaks", () => {
  const yakro = baileys({ isDefault: true });
  assert.deepEqual(chooseWhatsAppSender([meta(), yakro, baileys({ id: "pa-bouake", externalAccountId: "mp-bouake" })]), { kind: "account", account: yakro });
});

test("a disabled default is not replaced by another number", () => {
  assert.deepEqual(chooseWhatsAppSender([baileys({ isDefault: true, active: false }), meta(), baileys({ id: "pa-b" })]), { kind: "unavailable" });
});

test("a request may name one of the application's active numbers", () => {
  const abidjan = meta();
  assert.deepEqual(chooseWhatsAppSender([baileys({ isDefault: true }), abidjan], "pa-abidjan"), { kind: "account", account: abidjan });
});

test("a named number that is disabled or not the application's is refused", () => {
  assert.deepEqual(chooseWhatsAppSender([baileys(), meta({ active: false })], "pa-abidjan"), { kind: "unavailable" });
  assert.deepEqual(chooseWhatsAppSender([baileys()], "pa-other-brand"), { kind: "unavailable" });
  assert.deepEqual(chooseWhatsAppSender([], "pa-yakro"), { kind: "unavailable" });
});

test("a screen says which number an application's messages leave from", () => {
  assert.deepEqual(summarizeWhatsAppSender([]), { state: "organization" });
  assert.deepEqual(summarizeWhatsAppSender([baileys()]), { state: "own", label: "ESBTP Yakro" });
  assert.deepEqual(summarizeWhatsAppSender([baileys({ label: null })]), { state: "own", label: "•••• 0002" });
  assert.deepEqual(summarizeWhatsAppSender([baileys({ active: false })]), { state: "unavailable", reason: "disabled" });
  assert.deepEqual(summarizeWhatsAppSender([baileys(), meta()]), { state: "unavailable", reason: "ambiguous" });
});

test("the history names the frozen sender, never the whole number", () => {
  assert.equal(senderSnapshotLabel({ source: "organization", provider: "BAILEYS_WHATSAPP", label: null, address: "+2250701020304" }), "Numéro de l'organisation");
  assert.equal(senderSnapshotLabel({ source: "application", provider: "META_WHATSAPP", label: "ESBTP Yakro", address: "+2250701020304" }), "ESBTP Yakro");
  assert.equal(senderSnapshotLabel({ source: "application", provider: "META_WHATSAPP", label: null, address: "+2250701020304" }), "•••• 0304");
  assert.equal(senderSnapshotLabel(null), null);
  assert.equal(senderSnapshotLabel({ source: "other" }), null);
});
