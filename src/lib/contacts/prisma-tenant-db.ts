import { prisma } from "@/lib/prisma";
import type { TenantScopedDb } from "./tenant-scope";

/** Binds the organization-scoped helpers to the application's Prisma client. */
export const prismaTenantDb: TenantScopedDb = {
  contact: {
    findFirst: (args) => prisma.contact.findFirst(args),
  },
  contactTag: {
    findFirst: (args) => prisma.contactTag.findFirst(args),
    create: (args) => prisma.contactTag.create(args),
    deleteMany: (args) => prisma.contactTag.deleteMany(args),
  },
  contactList: {
    findFirst: (args) => prisma.contactList.findFirst(args),
    deleteMany: (args) => prisma.contactList.deleteMany(args),
  },
};
