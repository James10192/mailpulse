import { config as loadEnvironment } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

loadEnvironment({ path: ".env.local", quiet: true });
loadEnvironment({ path: ".env", quiet: true });

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) throw new Error("DATABASE_URL doit être défini pour le préflight de migration.");

const connectionString = databaseUrl.includes("sslmode=require") && !databaseUrl.includes("verify-full")
  ? databaseUrl.replace("sslmode=require", "sslmode=verify-full")
  : databaseUrl;
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const duplicates = await prisma.$queryRaw`
    SELECT 1
    FROM "communication_message"
    WHERE "providerMessageId" IS NOT NULL
    GROUP BY "providerMessageId"
    HAVING COUNT(*) > 1
    LIMIT 1
  `;

  if (duplicates.length > 0) {
    throw new Error("Des providerMessageId dupliqués existent dans communication_message. Résolvez-les avant prisma migrate deploy.");
  }

  console.log("Préflight de l'index providerMessageId : OK");
} catch (error) {
  if (error instanceof Error && error.message.startsWith("Des providerMessageId")) throw error;
  throw new Error("Le préflight de l'index providerMessageId n'a pas pu interroger la base de données.");
} finally {
  await prisma.$disconnect();
}
