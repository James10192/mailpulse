import { prisma } from "@/lib/prisma";
import type { CampaignScopedDb } from "./tenant-scope";

/** Binds the organization-scoped campaign helpers to the application's Prisma client. */
export const prismaCampaignDb: CampaignScopedDb = {
  emailSender: {
    findFirst: (args) => prisma.emailSender.findFirst(args),
  },
};
