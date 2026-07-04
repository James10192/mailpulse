import { prisma } from "@/lib/prisma";
import { syncSendingDomainFromResend } from "@/lib/resend-domains";
import { DomainsClient } from "./domains-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

async function getDomains(orgId: string) {
  const domains = await prisma.sendingDomain.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      domain: true,
      resendDomainId: true,
      status: true,
      verified: true,
      spfRecord: true,
      spfStatus: true,
      dkimRecord: true,
      dkimName: true,
      dkimStatus: true,
      region: true,
      createdAt: true,
    },
  });
  const syncedDomains = await Promise.all(
    domains.map((domain) => {
      if (domain.verified || !domain.resendDomainId) return domain;
      return syncSendingDomainFromResend(domain).catch(() => domain);
    })
  );

  return syncedDomains.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));
}

export default async function DomainsPage() {
  const ctx = await getCurrentUserAndOrg();
  const domains = ctx.org ? await getDomains(ctx.org.id) : [];

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Envoi", href: "/dashboard/senders" }, { label: "Domaines" }]} />
      <DomainsClient domains={domains} />
    </>
  );
}
