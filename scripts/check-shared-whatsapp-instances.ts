// Lists every Evolution instance used both by an organization's dashboard and by
// a provider account (an external application's WhatsApp number). Read-only: a
// single SELECT, no write, no call to Evolution.
//
// Run before any change that could log out, delete or rename an instance: the
// dashboard already refuses those actions on a shared instance, but a script or
// a manual intervention does not go through the dashboard.

import { config as loadEnvironment } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const USAGE = `Liste les instances Evolution partagées entre le tableau de bord d'une organisation
et un compte fournisseur (numéro d'une application externe). Lecture seule.

Usage:
  node --experimental-strip-types scripts/check-shared-whatsapp-instances.ts

Code de sortie : 0 si aucune instance partagée, 2 sinon.`;

type SharedInstanceRow = {
  organizationId: string;
  instanceName: string;
  providerAccountId: string;
  providerAccountOrganizationId: string;
  applicationId: string | null;
  active: boolean;
};

if (process.argv.includes("--help")) {
  console.log(USAGE);
  process.exit(0);
}

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL doit être défini.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

try {
  const rows = await prisma.$queryRaw<SharedInstanceRow[]>`
    SELECT o.id AS "organizationId",
           o."evoInstanceName" AS "instanceName",
           pa.id AS "providerAccountId",
           pa."organizationId" AS "providerAccountOrganizationId",
           pa."applicationId" AS "applicationId",
           pa.active AS "active"
    FROM organization o
    JOIN provider_account pa ON pa."externalAccountId" = o."evoInstanceName" AND pa.channel = 'WHATSAPP'
    ORDER BY o."evoInstanceName"`;

  if (rows.length === 0) {
    console.log("Aucune instance partagée.");
  } else {
    console.log(`${rows.length} instance(s) partagée(s) : aucune action destructive sans accord explicite.`);
    console.table(rows);
    process.exitCode = 2;
  }
} finally {
  await prisma.$disconnect();
}
