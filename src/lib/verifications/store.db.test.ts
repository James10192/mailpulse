import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { after, before, test } from "node:test";

/**
 * Atomicity of the real Prisma store, against a throwaway PostgreSQL schema.
 * Opt-in: runs only when VERIFICATION_TEST_DATABASE_URL points at a disposable
 * database. Never point it at a shared or production database.
 */
const url = process.env.VERIFICATION_TEST_DATABASE_URL?.trim();
const skip = !url
  ? "VERIFICATION_TEST_DATABASE_URL is not set"
  : url === process.env.DATABASE_URL?.trim()
    ? "VERIFICATION_TEST_DATABASE_URL must not be the application database"
    : false;

const schema = `verification_test_${Date.now()}`;
const require = createRequire(import.meta.url);
type SqlClient = { connect(): Promise<void>; query(sql: string, values?: unknown[]): Promise<unknown>; end(): Promise<void> };
let sql: SqlClient;
let client: { $disconnect(): Promise<void> };
let service: typeof import("./service");
let store: import("./store").VerificationStore;

before(async () => {
  if (skip) return;
  const pg = createRequire(require.resolve("@prisma/adapter-pg"))("pg") as { Client: new (options: { connectionString: string }) => SqlClient };
  sql = new pg.Client({ connectionString: url! });
  await sql.connect();
  await sql.query(`CREATE SCHEMA "${schema}"`);
  await sql.query(`SET search_path TO "${schema}"`);
  const migrations = resolve(process.cwd(), "prisma/migrations");
  for (const name of readdirSync(migrations).filter((entry) => !entry.endsWith(".toml")).sort()) {
    await sql.query(readFileSync(resolve(migrations, name, "migration.sql"), "utf8"));
  }
  await sql.query(`INSERT INTO "organization" ("id", "name", "slug") VALUES ('org_a', 'Test', 'test-org-a')`);
  await sql.query(`INSERT INTO "integration_api_key" ("id", "name", "keyHash", "keyPrefix", "updatedAt", "organizationId") VALUES ('key_a', 'Test', 'hash_a', 'mp_test', now(), 'org_a')`);

  const { PrismaClient } = await import("../../generated/prisma/client.js");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }, { schema }) });
  client = prisma;
  store = (await import("./store")).createPrismaVerificationStore(prisma);
  service = await import("./service");
});

after(async () => {
  if (skip) return;
  await client?.$disconnect();
  await sql.query(`DROP SCHEMA "${schema}" CASCADE`);
  await sql.end();
});

const SECRET = "d".repeat(32);
let lastCode = "";
const transport = { provider: "EVOLUTION_API", send: async (_to: string, text: string) => { lastCode = /(\d{6})/.exec(text)?.[1] ?? ""; return { messageId: null }; } };
const deps = () => ({ store, now: () => new Date(), secret: SECRET });
const start = (phoneNumber: string) =>
  service.startVerification(deps(), { organizationId: "org_a", apiKeyId: "key_a", phoneNumber, locale: "fr", reference: null, transport });

test("concurrent sends to one number create a single verification", { skip }, async () => {
  const results = await Promise.all(Array.from({ length: 5 }, () => start("+2250700000001")));
  assert.equal(results.filter((result) => result.type === "sent").length, 1);
});

test("concurrent right codes approve exactly once", { skip }, async () => {
  const started = await start("+2250700000002");
  const id = started.type === "sent" ? started.verification.id : "";
  const code = lastCode;
  const results = await Promise.all(Array.from({ length: 8 }, () => service.checkVerification(deps(), { organizationId: "org_a", id, code })));
  assert.equal(results.filter((result) => result.type === "approved").length, 1);
});

test("concurrent wrong codes never spend more than five attempts", { skip }, async () => {
  const started = await start("+2250700000003");
  const id = started.type === "sent" ? started.verification.id : "";
  const wrong = lastCode === "000000" ? "111111" : "000000";
  await Promise.all(Array.from({ length: 20 }, () => service.checkVerification(deps(), { organizationId: "org_a", id, code: wrong })));
  const row = await store.find("org_a", id);
  assert.equal(row?.attempts, 5);
  assert.equal(row?.status, "MAX_ATTEMPTS");
});
