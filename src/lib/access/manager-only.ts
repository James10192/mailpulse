import { canManageOrganization } from "@/lib/access/roles";

export const MANAGER_ONLY_MESSAGE = "Cette action est réservée aux propriétaires et administrateurs de l'organisation.";

/**
 * The refusal for a server action that changes who or what sends on the
 * organization's behalf (API keys, senders, WhatsApp numbers), or null when the
 * member may. Every member can send; only managers decide the identities.
 */
export function managerOnlyRefusal(access: { memberRole: string | null; isPlatformAdmin: boolean }) {
  return canManageOrganization(access) ? null : { error: MANAGER_ONLY_MESSAGE };
}
