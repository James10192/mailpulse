import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { SettingsPageFrame } from "../settings-page-frame";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsPage() {
  const { org } = await getCurrentUserAndOrg();
  const [keys, verifiedDomains, whatsapp] = org
    ? await Promise.all([
        prisma.integrationApiKey.findMany({
          where: { organizationId: org.id, provider: "FILON", revokedAt: null },
          orderBy: { createdAt: "desc" },
          select: { id: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
        }),
        prisma.sendingDomain.count({
          where: { organizationId: org.id, verified: true },
        }),
        prisma.organization.findUnique({
          where: { id: org.id },
          select: {
            whatsappEnabled: true,
            whatsappMode: true,
            metaPhoneNumberId: true,
            evoInstanceName: true,
          },
        }),
      ])
    : [[], 0, null];

  const configuredBaseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl =
    configuredBaseUrl && !configuredBaseUrl.includes("mailpulse.vercel.app")
      ? configuredBaseUrl
      : "https://mailpulse-two.vercel.app";
  const mailpulseEmailAvailable = !!process.env.MAILPULSE_MANAGED_FROM_EMAIL;
  const mailpulseWhatsAppAvailable = process.env.MAILPULSE_MANAGED_WHATSAPP_ENABLED === "true";

  return (
    <SettingsPageFrame section="integrations">
      <IntegrationsClient
        endpointUrl={`${baseUrl.replace(/\/$/, "")}/api/integrations/filon/recovery`}
        resourceStatus={{
          hasVerifiedDomain: verifiedDomains > 0,
          mailpulseEmailAvailable,
          whatsappEnabled: whatsapp?.whatsappEnabled ?? false,
          whatsappMode: whatsapp?.whatsappMode ?? "BAILEYS",
          hasMetaConfig: !!whatsapp?.metaPhoneNumberId,
          hasBaileysConfig: !!whatsapp?.evoInstanceName,
          mailpulseWhatsAppAvailable,
        }}
        keys={keys.map((key) => ({
          ...key,
          createdAt: key.createdAt.toISOString(),
          lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        }))}
      />
    </SettingsPageFrame>
  );
}
