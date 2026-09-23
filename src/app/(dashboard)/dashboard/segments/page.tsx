import { prisma } from "@/lib/prisma";
import { SegmentsClient } from "./segments-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { notFound } from "next/navigation";
import { PLAN_LIMITS } from "@/lib/plans";

async function getSegments(organizationId: string) {
  const segments = await prisma.contactList.findMany({
    where: { organizationId, type: "dynamic" },
    select: {
      id: true,
      name: true,
      description: true,
      contactCount: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  // Serialize Date to string for client component
  return segments.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));
}

export default async function SegmentsPage() {
  const { org } = await getCurrentUserAndOrg();
  if (!org) notFound();

  const segments = await getSegments(org.id);

  const plan = org.plan;
  const limits = PLAN_LIMITS[plan];
  const currentCount = segments.length;
  const canCreate = limits.segments === -1 || currentCount < limits.segments;
  const overLimit = limits.segments !== -1 && currentCount > limits.segments;

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Contacts", href: "/dashboard/contacts" }, { label: "Segments" }]} />
      <SegmentsClient
        segments={segments}
        canCreate={canCreate}
        limit={limits.segments}
        currentCount={currentCount}
        planLabel={limits.label}
        overLimit={overLimit}
      />
    </>
  );
}
