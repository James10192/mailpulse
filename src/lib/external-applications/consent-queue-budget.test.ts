import assert from "node:assert/strict";
import test from "node:test";

import { CONSENT_QUEUE_DEADLINE_MS } from "./consent-queue";
import { MAX_SEND_TIMEOUT_MS } from "@/lib/whatsapp/baileys-typing";

test("a send started just before the deadline still ends inside the 60 s cron run", () => {
  assert.ok(CONSENT_QUEUE_DEADLINE_MS > 0);
  assert.ok(CONSENT_QUEUE_DEADLINE_MS + MAX_SEND_TIMEOUT_MS < 60_000, `${CONSENT_QUEUE_DEADLINE_MS} + ${MAX_SEND_TIMEOUT_MS}`);
});
