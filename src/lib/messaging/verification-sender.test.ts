import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

// The Evolution client reads its configuration when first loaded.
process.env.EVOLUTION_API_URL = "https://evolution.test";
process.env.EVOLUTION_API_KEY = "test-key";

type Account = { id: string; provider: string; active: boolean; label: string | null; senderId: string | null; externalAccountId: string; credentialsCiphertext: string | null };

/** The application's WhatsApp accounts, as resolveWhatsAppSender reads them. */
function installAccounts(accounts: Account[]) {
  (globalThis as { prisma?: unknown }).prisma = {
    providerAccount: { async findMany() { return accounts; } },
  };
}

const { verificationTransportFor } = await import("../verifications/transport");

const ORG = {
  whatsappEnabled: true,
  whatsappMode: "BAILEYS" as const,
  whatsappPhone: null,
  evoInstanceName: "mp-organization",
  evoInstanceStatus: "open",
  metaWabaId: null,
  metaPhoneNumberId: null,
  metaAccessToken: null,
};

const YAKRO: Account = {
  id: "pa-yakro",
  provider: "BAILEYS_WHATSAPP",
  active: true,
  label: "ESBTP Yakro",
  senderId: null,
  externalAccountId: "mp-yakro",
  credentialsCiphertext: null,
};

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function stubEvolution() {
  const urls: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    urls.push(String(url));
    return Response.json({ key: { remoteJid: "x", fromMe: true, id: "3EB0" } }, { status: 201 });
  }) as typeof fetch;
  return urls;
}

test("a code for a key without an application leaves from the organization's number", async () => {
  installAccounts([]);
  const transport = await verificationTransportFor("org-a", null, ORG);
  assert.equal(transport?.senderAccountId, null);
  assert.equal(transport?.provider, "EVOLUTION_API");
});

test("a code for a school's key leaves from the school's number, exact recipient only", async () => {
  const urls = stubEvolution();
  installAccounts([YAKRO]);

  const transport = await verificationTransportFor("org-a", "app-yakro", ORG);
  await transport?.send("+2250707123456", "Votre code est 123456.");

  assert.equal(transport?.senderAccountId, "pa-yakro");
  assert.equal(urls.length, 1, "no legacy number variant may receive a code");
  assert.ok(urls[0].includes("/mp-yakro"), urls[0]);
});

test("a disabled school number refuses codes even when the organization could send them", async () => {
  installAccounts([{ ...YAKRO, active: false }]);
  assert.equal(await verificationTransportFor("org-a", "app-yakro", ORG), null);
});

test("a school on Meta cannot send codes: free text would never be delivered", async () => {
  installAccounts([{ ...YAKRO, provider: "META_WHATSAPP", senderId: "1098765432", credentialsCiphertext: null }]);
  assert.equal(await verificationTransportFor("org-a", "app-yakro", ORG), null);
});

test("an organization without an open WhatsApp Web session refuses codes", async () => {
  installAccounts([]);
  assert.equal(await verificationTransportFor("org-a", null, { ...ORG, evoInstanceStatus: "close" }), null);
});

const META_DEFAULT: Account & { isDefault: boolean } = {
  ...YAKRO,
  id: "pa-meta",
  provider: "META_WHATSAPP",
  senderId: "1098765432",
  isDefault: true,
};

test("with a Meta default, a code leaves from another of the school's own numbers", async () => {
  installAccounts([META_DEFAULT, YAKRO]);
  const transport = await verificationTransportFor("org-a", "app-yakro", ORG);
  assert.equal(transport?.senderAccountId, "pa-yakro");
});

test("a named number is used as is, never swapped for another", async () => {
  installAccounts([META_DEFAULT, YAKRO]);
  assert.equal((await verificationTransportFor("org-a", "app-yakro", ORG, "pa-yakro"))?.senderAccountId, "pa-yakro");
  assert.equal(await verificationTransportFor("org-a", "app-yakro", ORG, "pa-meta"), null);
  assert.equal(await verificationTransportFor("org-a", "app-yakro", ORG, "pa-other-school"), null);
});

test("a key without an application cannot name a number", async () => {
  installAccounts([YAKRO]);
  assert.equal(await verificationTransportFor("org-a", null, ORG, "pa-yakro"), null);
});
