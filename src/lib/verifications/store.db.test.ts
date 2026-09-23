import assert from "node:assert/strict";
import { after, before, test } from "node:test";

/**
 * Atomicity of the real Prisma store against PostgreSQL. Opt-in: runs only when
 * VERIFICATION_TEST_DATABASE_URL points at a disposable database whose schema is
 * already in place (CI pushes it before the tests). The test works in its own
 * organization and deletes it, with everything under it, when done. Never point
 * it at a shared or production database.
 */
const url = process.env.VERIFICATION_TEST_DATABASE_URL?.trim();
const skip = !url
  ? "VERIFICATION_TEST_DATABASE_URL is not set"
  : url === process.env.DATABASE_URL?.trim()
    ? "VERIFICATION_TEST_DATABASE_URL must not be the application database"
    : false;

const suffix = Date.now().toString(36);
const ORG = `verification_test_org_${suffix}`;
const KEY = `verification_test_key_${suffix}`;
type TestClient = {
  $disconnect(): Promise<void>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};
let client: TestClient;
let service: typeof import("./service");
let store: import("./store").VerificationStore;

before(async () => {
  if (skip) return;
  const { PrismaClient } = await import("../../generated/prisma/client.js");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });
  client = prisma;
  await prisma.organization.create({ data: { id: ORG, name: "Verification test", slug: ORG } });
  await prisma.integrationApiKey.create({ data: { id: KEY, name: "Verification test", keyHash: KEY, keyPrefix: "mp_test", organizationId: ORG } });
  store = (await import("./store")).createPrismaVerificationStore(prisma);
  service = await import("./service");
});

after(async () => {
  if (skip || !client) return;
  // Cascades to the key and every verification created here.
  await client.$executeRawUnsafe('DELETE FROM "organization" WHERE "id" = $1', ORG);
  await client.$disconnect();
});

const SECRET = "d".repeat(32);
let lastCode = "";
const transport = { provider: "EVOLUTION_API", send: async (_to: string, text: string) => { lastCode = /(\d{6})/.exec(text)?.[1] ?? ""; return { messageId: null }; } };
const deps = () => ({ store, now: () => new Date(), secret: SECRET });
const start = (phoneNumber: string) =>
  service.startVerification(deps(), { organizationId: ORG, apiKeyId: KEY, phoneNumber, locale: "fr", reference: null, transport });

test("concurrent sends to one number create a single verification", { skip }, async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => start("+2250700000001")));
  assert.equal(results.filter((result) => result.type === "sent").length, 1);
});

test("concurrent right codes approve exactly once", { skip }, async () => {
  const started = await start("+2250700000002");
  const id = started.type === "sent" ? started.verification.id : "";
  const code = lastCode;
  const results = await Promise.all(Array.from({ length: 8 }, () => service.checkVerification(deps(), { organizationId: ORG, id, code })));
  assert.equal(results.filter((result) => result.type === "approved").length, 1);
});

test("concurrent wrong codes never spend more than five attempts", { skip }, async () => {
  const started = await start("+2250700000003");
  const id = started.type === "sent" ? started.verification.id : "";
  const wrong = lastCode === "000000" ? "111111" : "000000";
  await Promise.all(Array.from({ length: 20 }, () => service.checkVerification(deps(), { organizationId: ORG, id, code: wrong })));
  const row = await store.find(ORG, id);
  assert.equal(row?.attempts, 5);
  assert.equal(row?.status, "MAX_ATTEMPTS");
});
