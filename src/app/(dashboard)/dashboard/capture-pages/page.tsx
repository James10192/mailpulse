import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { CapturePagesClient } from "./capture-pages-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getCapturePages(orgId: string) {
  const pages = await prisma.capturePage.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      published: true,
      createdAt: true,
    },
  });
  return pages.map((p) => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
  }));
}

export default async function CapturePagesPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;
  const pages = orgId ? await getCapturePages(orgId) : [];

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Pages de capture" }]} />
      <CapturePagesClient pages={pages} />
    </>
  );
}
