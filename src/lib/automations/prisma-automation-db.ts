import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import type { AutomationScopedDb } from "./tenant-scope";

/** Binds the organization-scoped automation helpers to a Prisma client or transaction. */
export function createAutomationDb(client: Prisma.TransactionClient): AutomationScopedDb {
  return {
    automation: {
      findFirst: (args) => client.automation.findFirst(args),
      updateMany: (args) => client.automation.updateMany(args),
      deleteMany: (args) => client.automation.deleteMany(args),
      count: (args) => client.automation.count(args),
    },
    automationStep: {
      deleteMany: (args) => client.automationStep.deleteMany(args),
      createMany: (args) => client.automationStep.createMany(args),
    },
  };
}

export const prismaAutomationDb: AutomationScopedDb = createAutomationDb(prisma);
