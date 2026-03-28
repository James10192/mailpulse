import { prisma } from "@/lib/prisma";
import { DomainsClient } from "./domains-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { canAccessFeature, PLAN_LIMITS, type PlanTier } from "@/lib/plans";

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
  const [domains, { org }] = await Promise.all([
    getDomains(),
    getCurrentUserAndOrg(),
  ]);
  const plan = (org?.plan ?? "FREE") as PlanTier;
  const canUseDomains = org ? canAccessFeature(plan, "custom_domain") : false;
  const planLabel = PLAN_LIMITS[plan].label;
  // If FREE plan has domains (from a downgrade), show warning
  const overLimit = !canUseDomains && domains.length > 0;

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Envoi", href: "/dashboard/senders" }, { label: "Domaines" }]} />
      <DomainsClient
        domains={domains}
        canUseDomains={canUseDomains}
        planLabel={planLabel}
        overLimit={overLimit}
      />
    </>
  );
}
