import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Get the current authenticated user and their organization.
 * Uses Better Auth session from request headers.
 */
export async function getCurrentUserAndOrg() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { user: null, org: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });
    if (!user) return { user: null, org: null };

    // Find the user's organization via membership
    const member = await prisma.member.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
      orderBy: { createdAt: "asc" },
    });

    let org;
    if (member) {
      org = await prisma.organization.findUnique({
        where: { id: member.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          emailsSentThisMonth: true,
          emailsResetAt: true,
          createdAt: true,
          logo: true,
          metadata: true,
        },
      });
    }

    if (!org) {
      // Create org + membership if user has none (first login)
      org = await prisma.organization.create({
        data: { name: user.name || "Mon organisation", slug: `org-${user.id.slice(0, 8)}` },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          emailsSentThisMonth: true,
          emailsResetAt: true,
          createdAt: true,
          logo: true,
          metadata: true,
        },
      });

      await prisma.member.create({
        data: {
          userId: user.id,
          organizationId: org.id,
          role: "owner",
        },
      }).catch(() => {});

      // Auto-create default sender for new orgs
      await prisma.emailSender.create({
        data: {
          name: org.name,
          email: "onboarding@resend.dev",
          isDefault: true,
          organizationId: org.id,
        },
      }).catch(() => {});
    }

    return { user, org };
  } catch {
    // Fallback for contexts where headers() isn't available (cron jobs, webhooks)
    return { user: null, org: null };
  }
}
