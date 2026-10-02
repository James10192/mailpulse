// Runs against a real database (DATABASE_URL, as in CI). Skipped without one.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

process.env.EXTERNAL_APPLICATION_KEK ??= Buffer.alloc(32, 7).toString("base64");
const hasDatabase = Boolean(process.env.DATABASE_URL);

const { prisma } = await import("@/lib/prisma");
const { recordPairedNumber, setDefaultNumber, setNumberActive, WhatsAppNumberError } = await import("./whatsapp-numbers");
const { resolveWhatsAppSender } = await import("../messaging/whatsapp-sender");
const { resolveWhatsAppProvider } = await import("./application");

const run = randomUUID().slice(0, 8);
const organizationId = `org-num-${run}`;
let applicationId = "";
let otherApplicationId = "";

before(async () => {
  if (!hasDatabase) return;
  await prisma.organization.create({ data: { id: organizationId, name: "KLASSCI", slug: `klassci-num-${run}` } });
  applicationId = (await prisma.externalApplication.create({ data: { organizationId, key: "esbtp", name: "ESBTP" } })).id;
  otherApplicationId = (await prisma.externalApplication.create({ data: { organizationId, key: "islg", name: "ISLG" } })).id;
});

after(async () => {
  if (!hasDatabase) return;
  await prisma.providerAccount.deleteMany({ where: { organizationId } });
  await prisma.externalApplication.deleteMany({ where: { organizationId } });
  await prisma.organization.deleteMany({ where: { id: organizationId } });
  await prisma.$disconnect();
});

const scope = () => ({ organizationId, applicationId });
const pair = (instanceName: string, senderId: string, replaceAccountId?: string) =>
  prisma.$transaction((tx) => recordPairedNumber(tx, { ...scope(), instanceName, senderId, replaceAccountId }));
const accountOf = (instanceName: string) =>
  prisma.providerAccount.findFirstOrThrow({ where: { organizationId, externalAccountId: instanceName } });

test("a second number is added beside the first, which stays the one that speaks", { skip: !hasDatabase }, async () => {
  await pair(`mp-a-${run}`, "2250700000001");
  const first = await accountOf(`mp-a-${run}`);
  assert.equal(first.isDefault, true, "a lone number is the default");

  await pair(`mp-b-${run}`, "2250700000002");
  const [a, b] = [await accountOf(`mp-a-${run}`), await accountOf(`mp-b-${run}`)];
  assert.equal(a.isDefault, true);
  assert.equal(b.isDefault, false);

  const sender = await resolveWhatsAppSender(organizationId, applicationId);
  assert.equal(sender.kind === "account" && sender.account.id, a.id);
  const command = await resolveWhatsAppProvider({ id: applicationId, key: "esbtp", organizationId });
  assert.equal(command?.id, a.id, "signed commands follow the same default");
});

test("a request may name another of the application's numbers, never another application's", { skip: !hasDatabase }, async () => {
  const b = await accountOf(`mp-b-${run}`);
  const named = await resolveWhatsAppSender(organizationId, applicationId, b.id);
  assert.equal(named.kind === "account" && named.account.id, b.id);
  assert.deepEqual(await resolveWhatsAppSender(organizationId, otherApplicationId, b.id), { kind: "unavailable" });
  assert.deepEqual(await resolveWhatsAppSender(organizationId, null, b.id), { kind: "unavailable" });
});

test("the default can be moved, and only to an active number of the application", { skip: !hasDatabase }, async () => {
  const b = await accountOf(`mp-b-${run}`);
  await prisma.$transaction((tx) => setDefaultNumber(tx, scope(), b.id));
  assert.equal((await accountOf(`mp-a-${run}`)).isDefault, false);
  assert.equal((await accountOf(`mp-b-${run}`)).isDefault, true);

  await assert.rejects(
    prisma.$transaction((tx) => setDefaultNumber(tx, { organizationId, applicationId: otherApplicationId }, b.id)),
    WhatsAppNumberError,
  );
});

test("disabling the default hands the role to another active number", { skip: !hasDatabase }, async () => {
  await pair(`mp-c-${run}`, "2250700000003");
  const b = await accountOf(`mp-b-${run}`);
  await prisma.$transaction((tx) => setNumberActive(tx, scope(), b.id, false));

  const accounts = await prisma.providerAccount.findMany({ where: { organizationId, applicationId, active: true } });
  assert.equal(accounts.filter((account) => account.isDefault).length, 1);
  const sender = await resolveWhatsAppSender(organizationId, applicationId);
  assert.equal(sender.kind, "account");
});

test("scanning the same phone again reuses its number rather than holding it twice", { skip: !hasDatabase }, async () => {
  const before = await prisma.providerAccount.count({ where: { organizationId, applicationId } });
  const previous = await pair(`mp-c2-${run}`, "2250700000003");
  assert.equal(previous, `mp-c-${run}`);
  assert.equal(await prisma.providerAccount.count({ where: { organizationId, applicationId } }), before);
});

test("replacing swaps the instance under the same number and keeps its name", { skip: !hasDatabase }, async () => {
  const a = await accountOf(`mp-a-${run}`);
  await prisma.providerAccount.update({ where: { id: a.id }, data: { label: "Scolarité" } });
  const previous = await pair(`mp-a2-${run}`, "2250700000009", a.id);
  assert.equal(previous, `mp-a-${run}`);
  const replaced = await prisma.providerAccount.findUniqueOrThrow({ where: { id: a.id } });
  assert.equal(replaced.externalAccountId, `mp-a2-${run}`);
  assert.equal(replaced.label, "Scolarité");
});

test("the database refuses two defaults for one application", { skip: !hasDatabase }, async () => {
  // CI builds its schema with `prisma db push`, which skips partial indexes:
  // apply the migration's own statement, so the SQL that ships is what is tested.
  const migration = readFileSync(
    resolve(process.cwd(), "prisma/migrations/20261002090000_add_provider_account_is_default/migration.sql"),
    "utf8",
  );
  const createIndex = migration.slice(migration.indexOf('CREATE UNIQUE INDEX "provider_account_whatsapp_default_key"'));
  await prisma.$executeRawUnsafe(createIndex.replace("CREATE UNIQUE INDEX", "CREATE UNIQUE INDEX IF NOT EXISTS").replace(/;\s*$/, ""));
  await assert.rejects(
    prisma.providerAccount.updateMany({ where: { organizationId, applicationId }, data: { isDefault: true } }),
  );
});

test("polling the same scan twice records it once", { skip: !hasDatabase }, async () => {
  const before = await prisma.providerAccount.count({ where: { organizationId, applicationId } });
  await prisma.$transaction((tx) => recordPairedNumber(tx, { ...scope(), instanceName: `mp-twice-${run}`, senderId: null }));
  await prisma.$transaction((tx) => recordPairedNumber(tx, { ...scope(), instanceName: `mp-twice-${run}`, senderId: null }));
  assert.equal(await prisma.providerAccount.count({ where: { organizationId, applicationId } }), before + 1);
});

test("replacing with a phone already held by another number is refused", { skip: !hasDatabase }, async () => {
  const a = await accountOf(`mp-a2-${run}`);
  await assert.rejects(
    prisma.$transaction((tx) => recordPairedNumber(tx, { ...scope(), instanceName: `mp-dup-${run}`, senderId: "2250700000003", replaceAccountId: a.id })),
    WhatsAppNumberError,
  );
});

test("two first pairings at once leave exactly one default", { skip: !hasDatabase }, async () => {
  const fresh = (await prisma.externalApplication.create({ data: { organizationId, key: `race-${run}`, name: "Race" } })).id;
  const target = { organizationId, applicationId: fresh };
  await Promise.all([
    prisma.$transaction((tx) => recordPairedNumber(tx, { ...target, instanceName: `mp-r1-${run}`, senderId: "2250700000101" })),
    prisma.$transaction((tx) => recordPairedNumber(tx, { ...target, instanceName: `mp-r2-${run}`, senderId: "2250700000102" })),
  ]);
  assert.equal(await prisma.providerAccount.count({ where: { organizationId, applicationId: fresh, isDefault: true } }), 1);
});
