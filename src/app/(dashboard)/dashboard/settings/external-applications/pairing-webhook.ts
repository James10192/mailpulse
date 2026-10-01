import { prisma } from "@/lib/prisma";
import { baileys } from "@/lib/whatsapp";
import { decryptExternalApplicationValue, encryptExternalApplicationValue } from "@/lib/external-applications/crypto";
import { inboundWebhookUrl } from "@/lib/external-applications/whatsapp-pairing";
import { ActionGuardError, ensureEncryptionConfigured, generateCredentialMaterial } from "./guards";

// Not a server action module: callers check the role first. Exporting these
// from a "use server" file would let any browser call them directly.

const INBOUND_PURPOSE = "INBOUND_FORWARD" as const;

/**
 * The secret Evolution presents on this application's webhook: the newest
 * valid inbound token, or a new one when the application has none yet. It is
 * never shown here: it only travels from MailPulse to Evolution.
 */
async function inboundSecret(applicationId: string) {
  const now = new Date();
  const current = await prisma.externalApplicationCredential.findFirst({
    where: { applicationId, purpose: INBOUND_PURPOSE, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { version: "desc" },
    select: { secretCiphertext: true },
  });
  if (current) return decryptExternalApplicationValue(current.secretCiphertext);

  ensureEncryptionConfigured();
  const material = generateCredentialMaterial("ik");
  await prisma.$transaction(async (tx) => {
    const latest = await tx.externalApplicationCredential.findFirst({
      where: { applicationId, purpose: INBOUND_PURPOSE },
      orderBy: { version: "desc" },
      select: { version: true },
    });
    await tx.externalApplicationCredential.create({
      data: {
        applicationId,
        purpose: INBOUND_PURPOSE,
        keyId: material.keyId,
        secretCiphertext: encryptExternalApplicationValue(material.secret),
        version: (latest?.version ?? 0) + 1,
      },
    });
  });
  return material.secret;
}

/** Points the instance's events (replies, STOP, delivery receipts) at this application. */
export async function pointInstanceAtApplication(instanceName: string, applicationId: string) {
  const url = inboundWebhookUrl(applicationId, {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  });
  if (!url) throw new ActionGuardError("L'adresse publique de MailPulse n'est pas configurée : WhatsApp ne pourrait pas lui transmettre les réponses.");
  const secret = await inboundSecret(applicationId);
  await baileys.setWebhook(instanceName, url, { Authorization: `Bearer ${secret}` });
}
