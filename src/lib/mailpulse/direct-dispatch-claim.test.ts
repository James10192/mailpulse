import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

// The Evolution client reads its configuration when first loaded.
process.env.EVOLUTION_API_URL = "https://evolution.test";
process.env.EVOLUTION_API_KEY = "test-key";

type Row = Record<string, unknown> & { id: string; status: string };

/**
 * A one-row communication_message table standing in for Prisma: `lib/prisma`
 * reads its client from `globalThis.prisma` before creating one.
 */
function installMessageTable(row: Row, options: { claimSucceeds: boolean }) {
  let claims = 0;
  const table = {
    async findUnique() { return { ...row, template: null }; },
    async findUniqueOrThrow() { return { ...row, template: null }; },
    async updateMany({ data }: { data: Record<string, unknown> }) {
      if (data.status === "PROCESSING") {
        claims += 1;
        if (!options.claimSucceeds) return { count: 0 };
      }
      Object.assign(row, data);
      return { count: 1 };
    },
  };
  (globalThis as { prisma?: unknown }).prisma = { communicationMessage: table };
  return { claims: () => claims };
}

const { dispatchQueuedMessage } = await import("./message-direct-dispatch");

const ORGANIZATION = {
  whatsappEnabled: true,
  whatsappMode: "BAILEYS" as const,
  whatsappPhone: null,
  evoInstanceName: "mp-org-a",
  evoInstanceStatus: "open",
  metaWabaId: null,
  metaPhoneNumberId: null,
  metaAccessToken: null,
};

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

function stubEvolution() {
  const delays: number[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    delays.push((JSON.parse(String(init?.body)) as { delay: number }).delay);
    return Response.json({ key: { remoteJid: "x", fromMe: true, id: "3EB0" } }, { status: 201 });
  }) as typeof fetch;
  return delays;
}

function whatsAppMessage(overrides: Partial<Row> = {}): Row {
  return {
    id: "msg-1",
    organizationId: "org-a",
    origin: "API",
    channel: "WHATSAPP",
    status: "QUEUED",
    contactId: null,
    contentType: "TEXT",
    recipientValue: "+2250707123456",
    text: "Votre rendez-vous est confirmé pour demain à 9 h, merci de votre confiance.",
    processingToken: "token-1",
    ...overrides,
  };
}

test("a request that loses the claim reports the message without sending or claiming it", async () => {
  const delays = stubEvolution();
  installMessageTable(whatsAppMessage({ status: "PROCESSING" }), { claimSucceeds: false });

  const result = await dispatchQueuedMessage("msg-1", { organization: ORGANIZATION });

  assert.equal(result.claimed, false);
  assert.deepEqual(delays, []);
});

test("a message already sent is only read back", async () => {
  const delays = stubEvolution();
  const table = installMessageTable(whatsAppMessage({ status: "SENT" }), { claimSucceeds: true });

  const result = await dispatchQueuedMessage("msg-1", { organization: ORGANIZATION });

  assert.equal(result.claimed, false);
  assert.equal(result.message.status, "SENT");
  assert.equal(table.claims(), 0);
  assert.deepEqual(delays, []);
});

test("the request that claims the message sends it once and says so", async () => {
  const delays = stubEvolution();
  installMessageTable(whatsAppMessage(), { claimSucceeds: true });

  const result = await dispatchQueuedMessage("msg-1", { organization: ORGANIZATION });

  assert.equal(result.claimed, true);
  assert.equal(result.message.status, "SENT");
  assert.equal(delays.length, 1);
});

test("an API message types like a person, a dashboard or campaign message briefly", async () => {
  const apiDelays = stubEvolution();
  installMessageTable(whatsAppMessage({ origin: "API" }), { claimSucceeds: true });
  await dispatchQueuedMessage("msg-1", { organization: ORGANIZATION });
  assert.ok(apiDelays[0] >= 2_000 && apiDelays[0] <= 10_000, `API delay ${apiDelays[0]}`);

  for (const origin of ["PLATFORM", "CAMPAIGN"]) {
    const delays = stubEvolution();
    installMessageTable(whatsAppMessage({ origin }), { claimSucceeds: true });
    await dispatchQueuedMessage("msg-1", { organization: ORGANIZATION });
    assert.ok(delays[0] >= 500 && delays[0] <= 1_500, `${origin} delay ${delays[0]}`);
  }
});
