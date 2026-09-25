import type { ExternalApplicationContext } from "@/lib/external-applications/application";
import { isConsentBlocking } from "@/lib/external-applications/consent-policy";
import { readRecipientConsent } from "@/lib/external-applications/consent-store";
import { prisma } from "@/lib/prisma";

/**
 * A recipient who answered NO or STOP receives nothing more from this
 * application through this sending account. A failed lookup throws rather than
 * answering "not refused": the caller turns it into a 503, never a send.
 */
export async function isRecipientRefused(application: ExternalApplicationContext, providerAccountId: string, recipient: string) {
  const consent = await readRecipientConsent(prisma, {
    organizationId: application.organizationId,
    applicationId: application.id,
    providerAccountId,
    recipient,
  });
  return isConsentBlocking(consent?.status);
}
