import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { isPlatformAdminEmail } from "@/lib/access/roles";

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

/**
 * Get the current authenticated user and their organization.
 * Returns nulls only when there is no valid session. A database or auth
 * failure is logged and rethrown, so it surfaces as an error instead of
 * looking like a signed-out user.
 */
export async function getCurrentUserAndOrg() {
  // 1. Try Better Auth session
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (session?.user) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (user) {
        const member = await prisma.member.findFirst({
          where: { userId: user.id },
          select: { organizationId: true, role: true },
          orderBy: { createdAt: "asc" },
        });

        let org = member
          ? await prisma.organization.findUnique({
              where: { id: member.organizationId },
              select: ORG_SELECT,
            })
          : null;

        if (!org) {
          org = await prisma.organization.create({
            data: { name: user.name || "Mon organisation", slug: `org-${user.id.slice(0, 8)}` },
            select: ORG_SELECT,
          });

          await prisma.member.create({
            data: { userId: user.id, organizationId: org.id, role: "owner" },
          }).catch(() => {});

          await prisma.emailSender.create({
            data: { name: org.name, email: "onboarding@resend.dev", isDefault: true, organizationId: org.id },
          }).catch(() => {});
        }

        // Platform administration comes from ADMIN_EMAILS only, never from an organization role.
        const isPlatformAdmin = isPlatformAdminEmail(user.email, process.env.ADMIN_EMAILS);

        return { user, org, memberRole: member?.role ?? null, isPlatformAdmin };
      }
    }
  } catch (error) {
    // Next.js request-time and navigation signals must reach the framework untouched.
    unstable_rethrow(error);
    console.error("[auth] Failed to resolve the current user and organization", error);
    throw error;
  }

  return { user: null, org: null, memberRole: null, isPlatformAdmin: false };
}
