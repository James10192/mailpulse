import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

// The Evolution client reads its configuration when first loaded.
process.env.EVOLUTION_API_URL = "https://evolution.test";
process.env.EVOLUTION_API_KEY = "test-key";

const { canSendVerificationCodes, whatsAppVerificationTransport } = await import("./transport");
const { sendWhatsApp, WhatsAppSendError } = await import("@/lib/whatsapp");

const ORG = {
  whatsappEnabled: true,
  whatsappMode: "BAILEYS" as const,
  whatsappPhone: null,
  evoInstanceName: "instance-a",
  evoInstanceStatus: "open",
  metaWabaId: null,
  metaPhoneNumberId: null,
  metaAccessToken: null,
};

// A 10-digit Ivorian mobile number: the generic sender also tries its legacy
// 8-digit form, which belongs to someone else.
const EXACT = "+2250707123456";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

/** Replaces the network: records every number Evolution is asked to reach. */
function stubEvolution(respond: () => Response) {
  const numbers: string[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    numbers.push((JSON.parse(String(init?.body)) as { number: string }).number);
    return respond();
  }) as typeof fetch;
  return numbers;
}

const notOnWhatsApp = () => new Response(JSON.stringify({ response: { message: [{ exists: false, number: "2250707123456" }] } }), { status: 400 });

test("a verification code is sent to the exact number only, never to a legacy variant", async () => {
  const numbers = stubEvolution(notOnWhatsApp);

  await assert.rejects(whatsAppVerificationTransport(ORG).send(EXACT, "Votre code de vérification est 123456."));
  assert.deepEqual(numbers, ["2250707123456"]);
});

test("the generic sender does try the legacy variant, so the test above is meaningful", async () => {
  const numbers = stubEvolution(notOnWhatsApp);

  await assert.rejects(sendWhatsApp(ORG, EXACT, "Bonjour"));
  assert.deepEqual(numbers, ["2250707123456", "22507123456"]);
});

test("a successful send resolves with the provider message id", async () => {
  stubEvolution(() => Response.json({ key: { remoteJid: "x", fromMe: true, id: "3EB0ABC" } }, { status: 201 }));

  const transport = whatsAppVerificationTransport(ORG);
  assert.equal(transport.provider, "EVOLUTION_API");
  assert.deepEqual(await transport.send(EXACT, "code"), { messageId: "3EB0ABC" });
});

test("an unknown recipient fails with a structured reason, whatever the wording", async () => {
  stubEvolution(notOnWhatsApp);

  const error = await whatsAppVerificationTransport(ORG).send(EXACT, "code").catch((caught: unknown) => caught);
  assert.ok(error instanceof WhatsAppSendError);
  assert.equal(error.reason, "recipient_unreachable");
});

test("any other provider error is a transport failure", async () => {
  stubEvolution(() => new Response("upstream down", { status: 500 }));

  const error = await whatsAppVerificationTransport(ORG).send(EXACT, "code").catch((caught: unknown) => caught);
  assert.ok(error instanceof WhatsAppSendError);
  assert.equal(error.reason, "transport");
});

test("codes are refused on WhatsApp Cloud API and on a disconnected Evolution session", () => {
  assert.equal(canSendVerificationCodes(ORG), true);
  assert.equal(canSendVerificationCodes({ ...ORG, whatsappMode: "META" as const, metaPhoneNumberId: "123", metaAccessToken: "token" }), false);
  assert.equal(canSendVerificationCodes({ ...ORG, evoInstanceStatus: "connecting" }), false);
  assert.equal(canSendVerificationCodes({ ...ORG, whatsappEnabled: false }), false);
});
