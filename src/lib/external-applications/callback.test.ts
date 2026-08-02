import assert from "node:assert/strict";
import test from "node:test";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { createAbsoluteRequestDeadline, isPublicIpAddress, pinnedHttpsRequestTarget } from "./network.ts";

test("rejects private, loopback, link-local, and multicast callback addresses", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.1.1", "192.0.2.1", "198.51.100.1", "203.0.113.1", "::1", "fe80::1", "fc00::1", "::ffff:127.0.0.1", "2001:db8::1"]) {
    assert.equal(isPublicIpAddress(address), false, address);
  }
  assert.equal(isPublicIpAddress("8.8.8.8"), true);
  assert.equal(isPublicIpAddress("2606:4700:4700::1111"), true);
});

test("pins callback connections to the validated DNS address while preserving TLS hostname", () => {
  const target = pinnedHttpsRequestTarget(new URL("https://callbacks.example.test/events?kind=inbound"), "8.8.8.8", 4);
  assert.equal(target.hostname, "8.8.8.8");
  assert.equal(target.servername, "callbacks.example.test");
  assert.equal(target.path, "/events?kind=inbound");
});

test("enforces an absolute callback deadline independently of socket activity", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const destroyed: Error[] = [];
  const cancelDeadline = createAbsoluteRequestDeadline({
    destroy(error) {
      destroyed.push(error as Error);
    },
  }, 100);

  t.mock.timers.tick(99);
  assert.equal(destroyed.length, 0);

  t.mock.timers.tick(1);
  assert.equal(destroyed.length, 1);
  assert.equal(destroyed[0]?.message, "External application callback timed out.");

  cancelDeadline();
  t.mock.timers.reset();
});

test("clears the absolute callback deadline once the request has finished", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let destroyCalls = 0;
  const cancelDeadline = createAbsoluteRequestDeadline({
    destroy() {
      destroyCalls += 1;
    },
  }, 100);

  cancelDeadline();
  t.mock.timers.tick(100);
  assert.equal(destroyCalls, 0);

  t.mock.timers.reset();
});
