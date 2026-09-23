import { cache } from "react";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { isPlatformAdmin } from "@/lib/access/roles";
import { ensureUserOrganization, type OrganizationProvisioningDb } from "@/lib/organizations/provisioning";

const ORG_SELECT = {
  id: true,
  name: true,
  slug: true,
  plan: true,
  emailsSentThisMonth: true,
  emailsResetAt: true,
  createdAt: true,
  logo: true,
  metadata: true,
} as const;

type CurrentOrganization = Prisma.OrganizationGetPayload<{ select: typeof ORG_SELECT }>;

const provisioningDb: OrganizationProvisioningDb<CurrentOrganization> = {
  async findMembership(userId) {
    const member = await prisma.member.findFirst({
      where: { userId },
      select: { role: true, organization: { select: ORG_SELECT } },
      orderBy: { createdAt: "asc" },
    });
    return member ? { org: member.organization, role: member.role } : null;
  },
  async createOrganizationWithOwner({ userId, name, slug }) {
    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({ data: { name, slug }, select: ORG_SELECT });
      await tx.member.create({ data: { userId, organizationId: org.id, role: "owner" } });
      return org;
    });
  },
};

async function createDefaultSender(org: CurrentOrganization) {
  try {
    await prisma.emailSender.create({
      data: { name: org.name, email: "onboarding@resend.dev", isDefault: true, organizationId: org.id },
    });
  } catch (error) {
    // The organization is usable without it; the user can add a sender later.
    console.error("[auth] Failed to create the default sender", { organizationId: org.id, error });
  }
}

/**
 * Get the current authenticated user and their organization, provisioning one
 * on the first visit. Cached per request.
 *
 * Returns nulls only when there is no valid session. A database or auth
 * failure is logged and rethrown, so it surfaces as an error instead of
 * looking like a signed-out user.
 */
export const getCurrentUserAndOrg = cache(async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (user) {
        const membership = await ensureUserOrganization(provisioningDb, user);
        if (membership.created) await createDefaultSender(membership.org);

        // Platform administration: a verified ADMIN_EMAILS address, never an organization role.
        const isPlatformAdminUser = isPlatformAdmin(user, process.env.ADMIN_EMAILS);

        return { user, org: membership.org, memberRole: membership.role, isPlatformAdmin: isPlatformAdminUser };
      }
    }
  } catch (error) {
    // Next.js request-time and navigation signals must reach the framework untouched.
    unstable_rethrow(error);
    console.error("[auth] Failed to resolve the current user and organization", error);
    throw error;
  }

  return { user: null, org: null, memberRole: null, isPlatformAdmin: false };
});
