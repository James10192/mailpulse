// An Evolution instance can serve both an organization's dashboard
// (Organization.evoInstanceName) and an external application
// (ProviderAccount.externalAccountId). Logging out or deleting it from the
// dashboard would silently cut the application's number too.

export type ProviderAccountReader = {
  providerAccount: {
    findFirst(args: {
      where: { externalAccountId: string };
      select: { id: true };
    }): Promise<{ id: string } | null>;
  };
};

export const SHARED_INSTANCE_REFUSAL =
  "Ce numéro WhatsApp est aussi utilisé par une application externe. Il ne peut pas être déconnecté ni réinitialisé depuis cet écran : contactez le support.";

/**
 * Whether any provider account points at this instance. Instance names are
 * global to the Evolution server, so the lookup spans every organization, and
 * an inactive account still counts: it can be reactivated on the same session.
 */
export async function isInstanceSharedWithProviderAccount(db: ProviderAccountReader, instanceName: string) {
  const account = await db.providerAccount.findFirst({
    where: { externalAccountId: instanceName },
    select: { id: true },
  });
  return account !== null;
}

/**
 * Refuses, before anything is touched, to log out or delete an instance that
 * also serves an external application: its number would stop for both.
 */
export async function assertInstanceNotShared(db: ProviderAccountReader, instanceName: string | null | undefined) {
  if (instanceName && await isInstanceSharedWithProviderAccount(db, instanceName)) {
    throw new Error(SHARED_INSTANCE_REFUSAL);
  }
}
