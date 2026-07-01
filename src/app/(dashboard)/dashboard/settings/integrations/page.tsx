import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
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

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const mailpulseEmailAvailable = !!process.env.MAILPULSE_MANAGED_FROM_EMAIL;
  const mailpulseWhatsAppAvailable = process.env.MAILPULSE_MANAGED_WHATSAPP_ENABLED === "true";

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Parametres", href: "/dashboard/settings" }, { label: "Integrations" }]} />
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
    </>
  );
}
