import { prisma } from "@/lib/prisma";
import { TemplatesClient } from "./templates-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

async function getTemplates() {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      createdAt: true,
    },
  });
  return templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));
}

export default async function TemplatesPage() {
  const [templates, ctx] = await Promise.all([
    getTemplates(),
    getCurrentUserAndOrg(),
  ]);

  const plan = (ctx.org?.plan ?? "FREE") as PlanTier;
  const limits = PLAN_LIMITS[plan];
  // Count non-snippet templates
  const currentCount = templates.filter((t) => t.category !== "snippet").length;
  const canCreate = limits.templates === -1 || currentCount < limits.templates;
  const overLimit = limits.templates !== -1 && currentCount > limits.templates;

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Templates" }]} />
      <TemplatesClient
        templates={templates}
        canCreate={canCreate}
        limit={limits.templates}
        currentCount={currentCount}
        planLabel={limits.label}
        overLimit={overLimit}
      />
    </>
  );
}
