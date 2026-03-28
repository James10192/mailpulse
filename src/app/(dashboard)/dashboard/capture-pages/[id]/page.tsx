import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { CapturePageDetail } from "./capture-page-detail";

export default async function CapturePageShowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { org } = await getCurrentUserAndOrg();
  if (!org) notFound();

  const page = await prisma.capturePage.findUnique({
    where: { id, organizationId: org.id },
    select: {
      id: true,
      name: true,
      slug: true,
      published: true,
      totalViews: true,
      conversions: true,
      buttonLabel: true,
      successMessage: true,
      fields: true,
      createdAt: true,
    },
  });

  if (!page) notFound();

  const [dailyStats, recentSubscribers] = await Promise.all([
    prisma.capturePageDailyStat.findMany({
      where: { capturePageId: id },
      orderBy: { date: "asc" },
      take: 30,
      select: { date: true, views: true, uniqueViews: true, conversions: true },
    }),
    prisma.contact.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, email: true, firstName: true, lastName: true, createdAt: true },
    }),
  ]);

  const conversionRate = page.totalViews > 0
    ? ((page.conversions / page.totalViews) * 100).toFixed(1)
    : "0.0";

  return (
    <>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Pages de capture", href: "/dashboard/capture-pages" },
          { label: page.name },
        ]}
      />
      <CapturePageDetail
        page={{
          ...page,
          createdAt: page.createdAt.toISOString(),
          conversionRate,
        }}
        dailyStats={dailyStats.map((s) => ({
          date: s.date.toISOString().slice(0, 10),
          views: s.views,
          uniqueViews: s.uniqueViews,
          conversions: s.conversions,
        }))}
        recentSubscribers={recentSubscribers.map((c) => ({
          id: c.id,
          email: c.email,
          name: [c.firstName, c.lastName].filter(Boolean).join(" ") || null,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
