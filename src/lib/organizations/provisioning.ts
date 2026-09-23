/**
 * Gives a signed-in user an organization on first visit, safely under concurrency.
 *
 * Two requests of a brand-new user can race to create the organization. The
 * loser hits the unique slug, re-reads the membership and returns the winner's
 * organization, so the first visit never fails.
 */
import { isUniqueConstraintViolation } from "../prisma-errors";

export type Membership<Org> = { org: Org; role: string };

export type OrganizationProvisioningDb<Org> = {
  findMembership(userId: string): Promise<Membership<Org> | null>;
  /** Creates the organization and its owner membership atomically. */
  createOrganizationWithOwner(input: { userId: string; name: string; slug: string }): Promise<Org>;
};

export function candidateOrganizationSlugs(userId: string): string[] {
  return [`org-${userId.slice(0, 8)}`, `org-${userId}`];
}

export async function ensureUserOrganization<Org>(
  db: OrganizationProvisioningDb<Org>,
  user: { id: string; name: string | null }
): Promise<Membership<Org> & { created: boolean }> {
  const existing = await db.findMembership(user.id);
  if (existing) return { ...existing, created: false };

  const name = user.name || "Mon organisation";
  for (const slug of candidateOrganizationSlugs(user.id)) {
    try {
      const org = await db.createOrganizationWithOwner({ userId: user.id, name, slug });
      return { org, role: "owner", created: true };
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) throw error;
      // Either a concurrent request of this user won, or the slug belongs to someone else.
      const raced = await db.findMembership(user.id);
      if (raced) return { ...raced, created: false };
    }
  }
  throw new Error(`Could not provision an organization for user ${user.id}`);
}
