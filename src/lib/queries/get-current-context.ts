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
          select: { organizationId: true },
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

        return { user, org };
      }
    }
  } catch {
    // Session failed — fall through to fallback
  }

  // 2. Fallback: findFirst (for dev, cron, or when session cookie isn't available)
  const user = await prisma.user.findFirst();
  if (!user) return { user: null, org: null };

  const member = await prisma.member.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
    orderBy: { createdAt: "asc" },
  });

  let org = member
    ? await prisma.organization.findUnique({
        where: { id: member.organizationId },
        select: ORG_SELECT,
      })
    : null;

  if (!org) {
    org = await prisma.organization.findFirst({ select: ORG_SELECT });
  }

  if (!org) {
    org = await prisma.organization.create({
      data: { name: "Mon organisation", slug: "mon-org" },
      select: ORG_SELECT,
    });

    await prisma.emailSender.create({
      data: { name: org.name, email: "onboarding@resend.dev", isDefault: true, organizationId: org.id },
    }).catch(() => {});
  }

  return { user, org };
}
