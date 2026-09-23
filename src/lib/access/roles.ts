/**
 * Two distinct notions of "administrator":
 * - a platform administrator operates MailPulse itself and is listed in ADMIN_EMAILS;
 * - an organization manager (owner or admin member) manages their own organization.
 * An organization role never grants platform rights.
 */

export const ORGANIZATION_MANAGER_ROLES = ["owner", "admin"] as const;

export function parseAdminAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isPlatformAdminEmail(email: string | null | undefined, allowlistRaw: string | undefined): boolean {
  if (!email) return false;
  return parseAdminAllowlist(allowlistRaw).has(email.trim().toLowerCase());
}

export function isOrganizationManagerRole(memberRole: string | null | undefined): boolean {
  return ORGANIZATION_MANAGER_ROLES.some((role) => role === memberRole);
}

/** Owners and admins manage their organization; platform administrators may too. */
export function canManageOrganization(access: { memberRole: string | null; isPlatformAdmin: boolean }): boolean {
  return access.isPlatformAdmin || isOrganizationManagerRole(access.memberRole);
}
