import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

const KEY_PREFIX = "mp_filon";

export function hashIntegrationKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export function createFilonApiKey() {
  const secret = crypto.randomBytes(32).toString("base64url");
  return `${KEY_PREFIX}_${secret}`;
}

export function keyPreview(key: string) {
  return `${key.slice(0, 12)}...${key.slice(-4)}`;
}

export async function authenticateFilonRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) return null;

  const key = await prisma.integrationApiKey.findFirst({
    where: {
      provider: "FILON",
      keyHash: hashIntegrationKey(token),
      revokedAt: null,
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
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

  if (!key) return null;

  await prisma.integrationApiKey.update({
    where: { id: key.id },
    data: { lastUsedAt: new Date() },
  });

  return key;
}
