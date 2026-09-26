import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

// The Evolution client reads its configuration when first loaded.
process.env.EVOLUTION_API_URL = "https://evolution.test";
process.env.EVOLUTION_API_KEY = "test-key";

const { probeInstance, sendText, sendDocument } = await import("@/lib/whatsapp-baileys");

const INSTANCE = "mp-org-a";
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

type Call = { url: string; body: Record<string, unknown> | null; signal: AbortSignal | null };

function stubEvolution(respond: () => Response | Promise<Response>) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : null,
      signal: init?.signal ?? null,
    });
    return respond();
  }) as typeof fetch;
  return calls;
}

/** What Evolution 2.3.7's instance guard answers for an unknown instance. */
const evolutionInstanceMissing = (name: string) => () => Response.json(
  { status: 404, error: "Not Found", response: { message: [`The "${name}" instance does not exist`] } },
  { status: 404 },
);

test("Evolution saying the instance does not exist is the only 'missing' answer", async () => {
  stubEvolution(evolutionInstanceMissing(INSTANCE));
  assert.deepEqual(await probeInstance(INSTANCE), { kind: "missing" });
});

test("an HTML 404 from a host standing in for Evolution never reads as a missing instance", async () => {
  stubEvolution(() => new Response("<!doctype html><title>404 Not Found</title>", { status: 404, headers: { "content-type": "text/html" } }));
  assert.equal((await probeInstance(INSTANCE)).kind, "unreachable");
});

test("a 404 about another instance, or about an unknown route, is not this instance missing", async () => {
  stubEvolution(evolutionInstanceMissing("mp-org-b"));
  assert.equal((await probeInstance(INSTANCE)).kind, "unreachable");

  stubEvolution(() => Response.json(
    { status: 404, error: "Not Found", response: { message: [`Cannot GET /instance/connectionState/${INSTANCE}`] } },
    { status: 404 },
  ));
  assert.equal((await probeInstance(INSTANCE)).kind, "unreachable");
});

test("a JSON 404 without Evolution's envelope is not trusted", async () => {
  stubEvolution(() => Response.json({ message: [`The "${INSTANCE}" instance does not exist`] }, { status: 404 }));
  assert.equal((await probeInstance(INSTANCE)).kind, "unreachable");
});

test("server errors, network failures and timeouts leave the instance alone", async () => {
  stubEvolution(() => Response.json({ status: 503, error: "Service Unavailable", response: { message: ["redis disconnected"] } }, { status: 503 }));
  assert.equal((await probeInstance(INSTANCE)).kind, "unreachable");

  stubEvolution(() => { throw new TypeError("fetch failed"); });
  assert.equal((await probeInstance(INSTANCE)).kind, "unreachable");

  stubEvolution(() => { throw new DOMException("The operation was aborted due to timeout", "TimeoutError"); });
  assert.equal((await probeInstance(INSTANCE)).kind, "unreachable");
});

test("a 200 page that carries no session state is not read as a closed session", async () => {
  stubEvolution(() => new Response("<html>welcome</html>", { status: 200 }));
  assert.equal((await probeInstance(INSTANCE)).kind, "unreachable");
});

test("a real session state is returned as is", async () => {
  stubEvolution(() => Response.json({ instance: { instanceName: INSTANCE, state: "open" } }));
  assert.deepEqual(await probeInstance(INSTANCE), { kind: "state", state: "open" });

  stubEvolution(() => Response.json({ instance: { instanceName: INSTANCE, state: "connecting" } }));
  assert.deepEqual(await probeInstance(INSTANCE), { kind: "state", state: "connecting" });
});

const sent = () => Response.json({ key: { remoteJid: "x", fromMe: true, id: "3EB0" } }, { status: 201 });

test("a text send disables link previews and simulates bounded typing", async () => {
  const calls = stubEvolution(sent);
  const longText = "x".repeat(5_000);

  await sendText(INSTANCE, "+225 07 07 12 34 56", longText);
  await sendText(INSTANCE, "2250707123456", "ok", { random: () => 0 });

  const [long, short] = calls.map((call) => call.body!);
  assert.equal(long.linkPreview, false);
  assert.equal(long.number, "2250707123456");
  assert.equal(long.delay, 10_000);
  assert.equal(short.delay, 2_000);
  assert.equal("presence" in long, false);
  assert.ok(calls.every((call) => call.signal instanceof AbortSignal));
});

test("an interactive send never types longer than 4 seconds", async () => {
  const calls = stubEvolution(sent);

  await sendText(INSTANCE, "2250707123456", "y".repeat(5_000), { priority: "interactive", random: () => 0.99 });

  assert.equal(calls[0].body!.delay, 4_000);
});

test("a document is typed after its caption, and without caption at the minimum", async () => {
  const calls = stubEvolution(sent);
  const document = { url: "https://files.test/a.pdf", filename: "a.pdf", mimeType: "application/pdf" };

  await sendDocument(INSTANCE, "2250707123456", document, { random: () => 0 });

  assert.equal(calls[0].body!.delay, 2_000);
  assert.equal(calls[0].body!.fileName, "a.pdf");
});

test("an empty number is refused before any network call", async () => {
  const calls = stubEvolution(sent);
  await assert.rejects(sendText(INSTANCE, "  ", "Bonjour"), /Numéro WhatsApp requis/);
  assert.equal(calls.length, 0);
});
