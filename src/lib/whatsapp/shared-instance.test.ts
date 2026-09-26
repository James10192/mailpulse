import assert from "node:assert/strict";
import test from "node:test";

import { assertInstanceNotShared, SHARED_INSTANCE_REFUSAL, type ProviderAccountReader } from "./shared-instance";

/** A provider_account table holding the given externalAccountId values. */
function providerAccounts(...instanceNames: string[]) {
  const lookups: string[] = [];
  const db: ProviderAccountReader = {
    providerAccount: {
      async findFirst({ where }) {
        lookups.push(where.externalAccountId);
        return instanceNames.includes(where.externalAccountId) ? { id: `pa-${where.externalAccountId}` } : null;
      },
    },
  };
  return { db, lookups };
}

test("an instance also used by a provider account is refused before any destructive call", async () => {
  const { db } = providerAccounts("mp-shared");
  await assert.rejects(assertInstanceNotShared(db, "mp-shared"), { message: SHARED_INSTANCE_REFUSAL });
});

test("an instance only the dashboard uses may be replaced", async () => {
  const { db, lookups } = providerAccounts("mp-shared");
  await assertInstanceNotShared(db, "mp-dashboard-only");
  assert.deepEqual(lookups, ["mp-dashboard-only"]);
});

test("no instance yet means nothing to protect and no lookup", async () => {
  const { db, lookups } = providerAccounts("mp-shared");
  await assertInstanceNotShared(db, null);
  await assertInstanceNotShared(db, undefined);
  assert.deepEqual(lookups, []);
});
