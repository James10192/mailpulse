import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import type { TenantScopedDb } from "./tenant-scope";

/** Binds the organization-scoped helpers to a Prisma client or transaction. */
export function createTenantDb(client: Prisma.TransactionClient): TenantScopedDb {
  return {
    contact: {
      findFirst: (args) => client.contact.findFirst(args),
    },
    contactTag: {
      findFirst: (args) => client.contactTag.findFirst(args),
      create: (args) => client.contactTag.create(args),
      deleteMany: (args) => client.contactTag.deleteMany(args),
    },
    contactList: {
      deleteMany: (args) => client.contactList.deleteMany(args),
    },
  };
}

export const prismaTenantDb: TenantScopedDb = createTenantDb(prisma);
