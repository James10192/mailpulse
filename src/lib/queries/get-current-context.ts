import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

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

function adminAllowlist() {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Get the current authenticated user and their organization.
 * Tries Better Auth session first, falls back to findFirst for dev/transition.
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

        const isAdmin = member?.role === "admin" || adminAllowlist().has(user.email.toLowerCase());

        return { user, org, memberRole: member?.role ?? null, isAdmin };
      }
    }
  } catch {
    // Session failed — no fallback, return null
  }

  return { user: null, org: null, memberRole: null, isAdmin: false };
}
