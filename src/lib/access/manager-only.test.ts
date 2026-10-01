import assert from "node:assert/strict";
import test from "node:test";

import { MANAGER_ONLY_MESSAGE, managerOnlyRefusal } from "./manager-only";

test("owners, admins and platform admins may change who sends", () => {
  assert.equal(managerOnlyRefusal({ memberRole: "owner", isPlatformAdmin: false }), null);
  assert.equal(managerOnlyRefusal({ memberRole: "admin", isPlatformAdmin: false }), null);
  assert.equal(managerOnlyRefusal({ memberRole: "member", isPlatformAdmin: true }), null);
});

test("a plain member is refused with a message the dashboard can show", () => {
  assert.deepEqual(managerOnlyRefusal({ memberRole: "member", isPlatformAdmin: false }), { error: MANAGER_ONLY_MESSAGE });
  assert.deepEqual(managerOnlyRefusal({ memberRole: null, isPlatformAdmin: false }), { error: MANAGER_ONLY_MESSAGE });
});
