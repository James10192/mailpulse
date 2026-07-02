import { prisma } from "@/lib/prisma";
import { previewSecret, randomSecret, sha256 } from "./crypto";

export type MailPulseApiEnvironment = "LIVE" | "TEST";

export function createMailPulseApiKey(environment: MailPulseApiEnvironment = "LIVE") {
  const prefix = environment === "TEST" ? "mp_test" : "mp_live";
  return `${prefix}_${randomSecret()}`;
}

export function keyHash(key: string) {
  return sha256(key);
}

export function keyPreview(key: string) {
  return previewSecret(key);
}

export async function authenticateApiRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) return null;

  const integrationKey = await prisma.integrationApiKey.findFirst({
    where: {
      keyHash: keyHash(token),
      revokedAt: null,
      provider: { in: ["MAILPULSE", "FILON"] },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          whatsappEnabled: true,
          whatsappMode: true,
          whatsappPhone: true,
          evoInstanceName: true,
          evoInstanceStatus: true,
          metaWabaId: true,
          metaPhoneNumberId: true,
          metaAccessToken: true,
        },
      },
    },
  });

  if (!integrationKey) return null;

  await prisma.integrationApiKey.update({
    where: { id: integrationKey.id },
    data: { lastUsedAt: new Date() },
  });

  return integrationKey;
}
