import assert from "node:assert/strict";
import test from "node:test";
import { PRIVATE_DESTINATION, guardedLookup, webhookTransport } from "./webhook-transport";

type Answer = { address: string; family: number }[];
const resolver = (answer: Answer) => (_hostname: string, callback: (error: NodeJS.ErrnoException | null, addresses: Answer) => void) => callback(null, answer);

function look(answer: Answer, options: object = {}) {
  return new Promise<{ error: Error | null; address: unknown; family?: number }>((resolve) => {
    guardedLookup(resolver(answer))("hooks.example.com", options as never, (error, address, family) => resolve({ error, address, family }));
  });
}

test("a public name resolving to a private address is refused at connection time", async () => {
  for (const address of ["10.0.0.5", "127.0.0.1", "169.254.169.254", "::1", "fd00::1"]) {
    const result = await look([{ address, family: address.includes(":") ? 6 : 4 }]);
    assert.equal(result.error?.message, PRIVATE_DESTINATION, address);
  }
});

test("one private address among public ones is enough to refuse", async () => {
  const result = await look([{ address: "93.184.216.34", family: 4 }, { address: "10.1.2.3", family: 4 }]);
  assert.equal(result.error?.message, PRIVATE_DESTINATION);
});

test("public addresses connect, in the shape node asks for", async () => {
  const single = await look([{ address: "93.184.216.34", family: 4 }]);
  assert.deepEqual(single, { error: null, address: "93.184.216.34", family: 4 });
  const all = await look([{ address: "93.184.216.34", family: 4 }, { address: "2606:2800:220:1::1", family: 6 }], { all: true });
  assert.equal(all.error, null);
  assert.equal((all.address as Answer).length, 2);
});

test("a refused URL is never called", async () => {
  assert.deepEqual(await webhookTransport.post("http://hooks.example.com/x", {}, "{}", 1000), { kind: "blocked", reason: "L'adresse doit être en HTTPS" });
  assert.deepEqual(await webhookTransport.post("https://localhost./x", {}, "{}", 1000), { kind: "blocked", reason: "Adresse interne refusée" });
});
