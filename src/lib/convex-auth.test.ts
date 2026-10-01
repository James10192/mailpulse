import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { exportJWK, generateKeyPair, jwtVerify, createLocalJWKSet } from "jose";
import { __test, signMemberToken, signServerToken, MEMBER_TOKEN_TTL_SECONDS, SERVER_SUBJECT } from "./convex-auth";
import { CONVEX_TOKEN_AUDIENCE, CONVEX_TOKEN_ISSUER } from "../../convex/authIdentity";
import { currentMember, requireMember, requireServer, clampLimit } from "../../convex/lib";

const ENV = "MAILPULSE_CONVEX_PRIVATE_JWK";
let jwks: ReturnType<typeof createLocalJWKSet>;

beforeEach(async () => {
  const { privateKey, publicKey } = await generateKeyPair("ES256", { extractable: true });
  process.env[ENV] = JSON.stringify({ ...(await exportJWK(privateKey)), kid: "test-kid" });
  jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: "test-kid", alg: "ES256" }] });
  __test.reset();
});

afterEach(() => {
  delete process.env[ENV];
  __test.reset();
});

/** Decoded claims, shaped like the identity Convex exposes to functions. */
async function identityFrom(token: string) {
  const { payload } = await jwtVerify(token, jwks, { issuer: CONVEX_TOKEN_ISSUER, audience: CONVEX_TOKEN_AUDIENCE });
  return { ...payload, subject: payload.sub!, issuer: payload.iss!, tokenIdentifier: `${payload.iss}|${payload.sub}` };
}

function ctxWith(identity: unknown) {
  return { auth: { getUserIdentity: async () => identity } } as never;
}

describe("Convex tokens", () => {
  test("a member token carries the user, the organization and an expiry", async () => {
    const now = Date.UTC(2026, 9, 1, 12);
    const signed = await signMemberToken({ userId: "u1", organizationId: "o1", name: "Awa" }, now);
    assert.equal(signed.expiresAt, now + MEMBER_TOKEN_TTL_SECONDS * 1000);

    const { payload, protectedHeader } = await jwtVerify(signed.token, jwks, {
      issuer: CONVEX_TOKEN_ISSUER,
      audience: CONVEX_TOKEN_AUDIENCE,
      currentDate: new Date(now),
    });
    assert.equal(protectedHeader.alg, "ES256");
    assert.equal(protectedHeader.kid, "test-kid");
    assert.equal(payload.sub, "u1");
    assert.equal(payload.org, "o1");
    assert.equal(payload.role, "member");
  });

  test("Convex reads a member token as that member", async () => {
    const { token } = await signMemberToken({ userId: "u1", organizationId: "o1", name: "Awa" });
    assert.deepEqual(await currentMember(ctxWith(await identityFrom(token))), { userId: "u1", organizationId: "o1", name: "Awa" });
  });

  test("a server token is not a member, and only it may write", async () => {
    const { token } = await signServerToken();
    const identity = await identityFrom(token);
    assert.equal(identity.subject, SERVER_SUBJECT);
    assert.equal(await currentMember(ctxWith(identity)), null);
    await requireServer(ctxWith(identity));

    const member = await identityFrom((await signMemberToken({ userId: "u1", organizationId: "o1", name: "Awa" })).token);
    await assert.rejects(requireServer(ctxWith(member)));
  });

  test("no token, another issuer or no organization grants nothing", async () => {
    assert.equal(await currentMember(ctxWith(null)), null);
    await assert.rejects(requireMember(ctxWith(null)));
    await assert.rejects(requireServer(ctxWith(null)));

    const foreign = { subject: "u1", issuer: "https://other.example", role: "member", org: "o1" };
    assert.equal(await currentMember(ctxWith(foreign)), null);
    await assert.rejects(requireServer(ctxWith({ ...foreign, role: "server" })));

    const noOrg = { subject: "u1", issuer: CONVEX_TOKEN_ISSUER, role: "member" };
    assert.equal(await currentMember(ctxWith(noOrg)), null);
  });

  test("a missing or public-only key refuses to sign", async () => {
    delete process.env[ENV];
    __test.reset();
    await assert.rejects(signServerToken(), /MAILPULSE_CONVEX_PRIVATE_JWK/);

    const { publicKey } = await generateKeyPair("ES256", { extractable: true });
    process.env[ENV] = JSON.stringify({ ...(await exportJWK(publicKey)), kid: "k" });
    __test.reset();
    await assert.rejects(signServerToken(), /private P-256 JWK/);
  });
});

describe("list limits", () => {
  test("are clamped so a caller cannot read a whole table", () => {
    assert.equal(clampLimit(undefined, 20), 20);
    assert.equal(clampLimit(10_000, 20), 50);
    assert.equal(clampLimit(0, 20), 1);
    assert.equal(clampLimit(Number.NaN, 20), 20);
  });
});
