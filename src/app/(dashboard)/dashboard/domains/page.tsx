import { prisma } from "@/lib/prisma";
import { DomainsClient } from "./domains-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getDomains() {
  const domains = await prisma.sendingDomain.findMany({
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
      createdAt: true,
    },
  });
  return domains.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));
}

export default async function DomainsPage() {
  const domains = await getDomains();

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Envoi", href: "/dashboard/senders" }, { label: "Domaines" }]} />
      <DomainsClient domains={domains} />
    </>
  );
}
