import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

// The Evolution client reads its configuration when first loaded.
process.env.EVOLUTION_API_URL = "https://evolution.test";
process.env.EVOLUTION_API_KEY = "test-key";

type Row = Record<string, unknown> & { id: string; status: string };
type Account = { id: string; organizationId: string; provider: string; active: boolean; label: string | null; senderId: string | null; externalAccountId: string; credentialsCiphertext: string | null };

/** Prisma stand-in: one message row and the organization's provider accounts. */
function installDatabase(row: Row, accounts: Account[]) {
  (globalThis as { prisma?: unknown }).prisma = {
    communicationMessage: {
      async findUnique() { return { ...row, template: null }; },
      async findUniqueOrThrow() { return { ...row, template: null }; },
      async updateMany({ data }: { data: Record<string, unknown> }) {
        Object.assign(row, data);
        return { count: 1 };
      },
    },
    providerAccount: {
      async findFirst({ where }: { where: { organizationId: string; id: string } }) {
        return accounts.find((account) => account.organizationId === where.organizationId && account.id === where.id) ?? null;
      },
    },
  };
  return row;
}

const { dispatchQueuedMessage } = await import("../mailpulse/message-direct-dispatch");

const ORGANIZATION = {
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
  organizationId: "org-a",
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

function message(overrides: Partial<Row> = {}): Row {
  return {
    id: "msg-1",
    organizationId: "org-a",
    origin: "API",
    channel: "WHATSAPP",
    status: "QUEUED",
    contactId: null,
    contentType: "TEXT",
    recipientValue: "+2250707123456",
    text: "Votre inscription est confirmée.",
    processingToken: "token-1",
    senderAccountId: null,
    ...overrides,
  };
}

test("a message created for an application's number leaves from that number", async () => {
  const urls = stubEvolution();
  const row = installDatabase(message({ senderAccountId: "pa-yakro" }), [YAKRO]);

  await dispatchQueuedMessage("msg-1", { organization: ORGANIZATION });

  assert.equal(row.status, "SENT");
  assert.equal(row.provider, "EVOLUTION_API");
  assert.ok(urls.every((url) => url.includes("/mp-yakro")), urls.join(", "));
});

test("a disabled application number refuses the message instead of using the organization's", async () => {
  const urls = stubEvolution();
  const row = installDatabase(message({ senderAccountId: "pa-yakro" }), [{ ...YAKRO, active: false }]);

  await dispatchQueuedMessage("msg-1", { organization: ORGANIZATION });

  assert.equal(row.status, "FAILED");
  assert.equal(row.errorCode, "sender_unavailable");
  assert.deepEqual(urls, []);
});

test("another organization's account is never used, even by id", async () => {
  const urls = stubEvolution();
  const row = installDatabase(message({ senderAccountId: "pa-yakro" }), [{ ...YAKRO, organizationId: "org-b" }]);

  await dispatchQueuedMessage("msg-1", { organization: ORGANIZATION });

  assert.equal(row.errorCode, "sender_unavailable");
  assert.deepEqual(urls, []);
});

test("a message without an application number still leaves from the organization's", async () => {
  const urls = stubEvolution();
  const row = installDatabase(message(), [YAKRO]);

  await dispatchQueuedMessage("msg-1", { organization: ORGANIZATION });

  assert.equal(row.status, "SENT");
  assert.ok(urls.every((url) => url.includes("/mp-organization")), urls.join(", "));
});
