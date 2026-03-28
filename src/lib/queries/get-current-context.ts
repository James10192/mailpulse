import { prisma } from "@/lib/prisma";

/**
 * Get the current user and organization for server actions.
 * TODO: Replace with Better Auth session lookup via auth.api.getSession()
 */
export async function getCurrentUserAndOrg() {
  const user = await prisma.user.findFirst();
  if (!user) return { user: null, org: null };

  let org = await prisma.organization.findFirst({
    select: { id: true, name: true, slug: true, plan: true, emailsSentThisMonth: true, emailsResetAt: true, createdAt: true, logo: true, metadata: true },
  });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: "Mon organisation", slug: "mon-org" },
      select: { id: true, name: true, slug: true, plan: true, emailsSentThisMonth: true, emailsResetAt: true, createdAt: true, logo: true, metadata: true },
    });
  }

  return { user, org };
}
