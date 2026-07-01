import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { IntegrationsClient } from "./integrations-client";

export default async function IntegrationsPage() {
  const { org } = await getCurrentUserAndOrg();
  const keys = org
    ? await prisma.integrationApiKey.findMany({
        where: { organizationId: org.id, provider: "FILON", revokedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
      })
    : [];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Parametres", href: "/dashboard/settings" }, { label: "Integrations" }]} />
      <IntegrationsClient
        endpointUrl={`${baseUrl.replace(/\/$/, "")}/api/integrations/filon/recovery`}
        keys={keys.map((key) => ({
          ...key,
          createdAt: key.createdAt.toISOString(),
          lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
