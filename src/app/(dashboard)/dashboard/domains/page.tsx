import { prisma } from "@/lib/prisma";
import { DomainsClient } from "./domains-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getDomains() {
  const domains = await prisma.sendingDomain.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  // Serialize Date to string for client component
  return domains.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
    verifiedAt: d.verifiedAt?.toISOString() ?? null,
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
