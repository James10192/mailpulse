import assert from "node:assert/strict";
import test from "node:test";
import { canManageOrganization, isOrganizationManagerRole, isPlatformAdmin, isPlatformAdminEmail } from "./roles";

test("platform administration comes from the allowlist only", () => {
  const allowlist = " Ops@Example.com , second@example.com ";
  assert.equal(isPlatformAdminEmail("ops@example.com", allowlist), true);
  assert.equal(isPlatformAdminEmail("OPS@EXAMPLE.COM", allowlist), true);
  assert.equal(isPlatformAdminEmail("someone@example.com", allowlist), false);
  assert.equal(isPlatformAdminEmail("ops@example.com", undefined), false);
  assert.equal(isPlatformAdminEmail("ops@example.com", ""), false);
  assert.equal(isPlatformAdminEmail(null, allowlist), false);
});

test("an organization admin or owner manages their organization", () => {
  assert.equal(isOrganizationManagerRole("owner"), true);
  assert.equal(isOrganizationManagerRole("admin"), true);
  assert.equal(isOrganizationManagerRole("member"), false);
  assert.equal(isOrganizationManagerRole(null), false);
  assert.equal(canManageOrganization({ memberRole: "admin", isPlatformAdmin: false }), true);
  assert.equal(canManageOrganization({ memberRole: "owner", isPlatformAdmin: false }), true);
});

test("a plain member manages nothing unless platform admin", () => {
  assert.equal(canManageOrganization({ memberRole: "member", isPlatformAdmin: false }), false);
  assert.equal(canManageOrganization({ memberRole: null, isPlatformAdmin: false }), false);
  assert.equal(canManageOrganization({ memberRole: "member", isPlatformAdmin: true }), true);
});

test("an allowlisted address is not a platform admin until it is verified", () => {
  const allowlist = "ops@example.com";
  assert.equal(isPlatformAdmin({ email: "ops@example.com", emailVerified: false }, allowlist), false);
  assert.equal(isPlatformAdmin({ email: "ops@example.com", emailVerified: true }, allowlist), true);
  assert.equal(isPlatformAdmin({ email: "someone@example.com", emailVerified: true }, allowlist), false);
});
