import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnvironment } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL doit être défini pour le préflight d'historique de migrations.");

const connectionString = databaseUrl.includes("sslmode=require") && !databaseUrl.includes("verify-full")
  ? databaseUrl.replace("sslmode=require", "sslmode=verify-full")
  : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const migrationsDirectory = resolve(process.cwd(), "prisma/migrations");
const localMigrations = new Set(
  readdirSync(migrationsDirectory).filter((entry) => statSync(resolve(migrationsDirectory, entry)).isDirectory()),
);

try {
  const applied = await prisma.$queryRaw`
    SELECT "migration_name"
    FROM "_prisma_migrations"
    WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL
    ORDER BY "migration_name"
  `;

  const orphans = applied.map((row) => row.migration_name).filter((name) => !localMigrations.has(name));

  const residualTables = await prisma.$queryRaw`
    SELECT "tablename"
    FROM "pg_tables"
    WHERE "schemaname" = 'public'
      AND ("tablename" LIKE 'parent_chatbot%' OR "tablename" LIKE 'klassci%')
    ORDER BY "tablename"
  `;

  if (residualTables.length > 0) {
    console.warn(
      `Tables héritées encore présentes en base : ${residualTables.map((row) => row.tablename).join(", ")}.\n`
      + "Elles ne sont référencées par aucun modèle Prisma. À supprimer manuellement après vérification du contenu.",
    );
  }

  if (orphans.length > 0) {
    throw new Error(
      `Historique de migrations divergent. Ces migrations sont enregistrées comme appliquées en base mais absentes de prisma/migrations :\n`
      + orphans.map((name) => `  - ${name}`).join("\n")
      + "\n\nUn déploiement sur une base neuve produirait donc un schéma différent de celui-ci."
      + "\nDeux remédiations possibles, à trancher après inspection de la base :"
      + "\n  1. Restaurer les dossiers de migration manquants tels qu'ils ont été appliqués (le checksum enregistré doit correspondre au fichier restauré)."
      + "\n  2. Supprimer les lignes correspondantes de _prisma_migrations si leur effet a bien été annulé par une migration ultérieure."
      + "\nAucune des deux n'est automatisée ici : les deux sont destructives à leur manière.",
    );
  }

  console.log(`Préflight d'historique de migrations : OK (${applied.length} migrations appliquées, toutes présentes localement)`);
} finally {
  await prisma.$disconnect();
}
