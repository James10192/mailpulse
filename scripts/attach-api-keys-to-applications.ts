// Attaches MailPulse API keys to applications, so that a key sends from its
// application's WhatsApp number and survives rotation without losing it.
//
// Dry run by default. A key without an application keeps sending from its
// organization's number; creating an application for it changes nothing until
// that application is given a number of its own.

import { parseArgs } from "node:util";

import { config as loadEnvironment } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

// @ts-expect-error Node's type-strip runner requires explicit TypeScript extensions.
import { planApplicationsForKeys } from "../src/lib/messaging/api-key-applications.ts";

const USAGE = `Rattache les clés API MailPulse à des applications (idempotent).

Usage:
  node --experimental-strip-types scripts/attach-api-keys-to-applications.ts [--org <slug-ou-id>] [--apply]
  node --experimental-strip-types scripts/attach-api-keys-to-applications.ts --attach <keyId>=<applicationKey> [--apply]

Sans --attach : les clés actives sans application et portant le même nom forment une
application nouvelle, créée à leur nom. Une clé n'est jamais rattachée d'office à une
application existante : celle-ci peut avoir son propre numéro WhatsApp.

Avec --attach : rattache une clé à une application existante de la même organisation.
La clé enverra alors depuis le numéro WhatsApp de cette application.

Sans --apply, rien n'est écrit : le plan est seulement affiché.`;

const { values } = parseArgs({
  options: {
    org: { type: "string" },
    attach: { type: "string", multiple: true },
    apply: { type: "boolean", default: false },
    help: { type: "boolean", default: false },
  },
});

if (values.help) {
  console.log(USAGE);
  process.exit(0);
}

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL doit être défini.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const apply = values.apply ?? false;

try {
  if (values.attach?.length) {
    await attachExplicitly(values.attach);
  } else {
    await attachByName(values.org ?? null);
  }
  if (!apply) console.log("\nSimulation : rien n'a été écrit. Relancer avec --apply pour appliquer.");
} finally {
  await prisma.$disconnect();
}

async function attachByName(organizationRef: string | null) {
  const organizations = await prisma.organization.findMany({
    where: organizationRef ? { OR: [{ id: organizationRef }, { slug: organizationRef }] } : {},
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  if (organizationRef && organizations.length === 0) throw new Error(`Organisation introuvable : ${organizationRef}`);

  let created = 0;
  let attached = 0;
  for (const organization of organizations) {
    const keys = await prisma.integrationApiKey.findMany({
      where: { organizationId: organization.id, provider: "MAILPULSE", revokedAt: null, applicationId: null },
      select: { id: true, name: true, defaultEmailSenderId: true },
      orderBy: { createdAt: "asc" },
    });
    if (keys.length === 0) continue;

    const existing = await prisma.externalApplication.findMany({
      where: { organizationId: organization.id },
      select: { key: true },
    });
    const plan = planApplicationsForKeys(keys, existing.map((application) => application.key));
    console.log(`\n${organization.name} (${organization.id})`);
    for (const planned of plan) {
      console.log(`  + application ${planned.key} « ${planned.name} » ← clé(s) ${planned.apiKeyIds.join(", ")}`
        + (planned.defaultEmailSenderId ? `, expéditeur e-mail ${planned.defaultEmailSenderId}` : ""));
      if (!apply) continue;

      await prisma.$transaction(async (tx) => {
        const application = await tx.externalApplication.create({
          data: {
            organizationId: organization.id,
            key: planned.key,
            name: planned.name,
            active: true,
            defaultEmailSenderId: planned.defaultEmailSenderId,
          },
          select: { id: true },
        });
        // Re-checked inside the write: a key attached meanwhile is left alone.
        const result = await tx.integrationApiKey.updateMany({
          where: { id: { in: planned.apiKeyIds }, organizationId: organization.id, applicationId: null },
          data: { applicationId: application.id },
        });
        attached += result.count;
      });
      created += 1;
    }
  }
  console.log(apply ? `\n${created} application(s) créée(s), ${attached} clé(s) rattachée(s).` : "");
}

async function attachExplicitly(pairs: string[]) {
  for (const pair of pairs) {
    const [keyId, applicationKey] = pair.split("=");
    if (!keyId || !applicationKey) throw new Error(`--attach attend <keyId>=<applicationKey> (reçu : ${pair}).`);

    const apiKey = await prisma.integrationApiKey.findFirst({
      where: { id: keyId, provider: "MAILPULSE" },
      select: { id: true, name: true, organizationId: true, applicationId: true, revokedAt: true },
    });
    if (!apiKey) throw new Error(`Clé introuvable : ${keyId}`);
    if (apiKey.revokedAt) throw new Error(`Clé ${keyId} révoquée : elle n'envoie plus rien.`);

    // Looked up within the key's organization only: a key can never be
    // attached to another organization's application.
    const application = await prisma.externalApplication.findFirst({
      where: { organizationId: apiKey.organizationId, key: applicationKey },
      select: { id: true, key: true, active: true },
    });
    if (!application) throw new Error(`Application ${applicationKey} introuvable dans l'organisation de la clé.`);
    if (!application.active) throw new Error(`Application ${applicationKey} désactivée : ses clés seraient refusées.`);
    if (apiKey.applicationId && apiKey.applicationId !== application.id) {
      throw new Error(`Clé ${keyId} déjà rattachée à une autre application : la détacher d'abord, explicitement.`);
    }

    console.log(`  ${apiKey.name} (${apiKey.id}) → ${application.key} · WhatsApp : ${await describeApplicationNumber(apiKey.organizationId, application.id)}`);
    if (!apply) continue;

    await prisma.integrationApiKey.update({ where: { id: apiKey.id }, data: { applicationId: application.id } });
  }
}

/** Says what src/lib/messaging/whatsapp-sender.ts will decide for this application. */
async function describeApplicationNumber(organizationId: string, applicationId: string) {
  const accounts = await prisma.providerAccount.findMany({
    where: { organizationId, applicationId, channel: "WHATSAPP", provider: { in: ["META_WHATSAPP", "BAILEYS_WHATSAPP"] } },
    select: { active: true, label: true, senderId: true, externalAccountId: true },
  });
  if (accounts.length === 0) return "numéro de l'organisation (l'application n'en a pas)";
  const active = accounts.filter((account) => account.active);
  if (active.length === 1) return active[0].label ?? active[0].senderId ?? active[0].externalAccountId;
  return active.length === 0
    ? "AUCUN : le numéro de l'application est désactivé, ses messages échoueront (sender_unavailable)"
    : "AUCUN : l'application a plusieurs numéros actifs, ses messages échoueront (sender_unavailable)";
}
