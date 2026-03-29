import { PrismaClient } from "@/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Ensure sslmode=verify-full to suppress pg v9 security warning
  let url = process.env.DATABASE_URL!;
  if (url.includes("sslmode=require") && !url.includes("verify-full")) {
    url = url.replace("sslmode=require", "sslmode=verify-full");
  }
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
