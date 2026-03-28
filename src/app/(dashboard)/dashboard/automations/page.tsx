import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";
import { AutomationsClient } from "./automations-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getAutomations() {
  const automations = await prisma.automation.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      trigger: true,
      status: true,
      createdAt: true,
    },
  });
  return automations.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));
}

export default async function AutomationsPage() {
  const [automations, ctx] = await Promise.all([
    getAutomations(),
    getCurrentUserAndOrg(),
  ]);
  const plan = (ctx.org?.plan ?? "FREE") as PlanTier;
  const limits = PLAN_LIMITS[plan];
  const currentCount = automations.filter((a) => a.status !== "ARCHIVED").length;
  const canCreate = limits.automations === -1 || currentCount < limits.automations;

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Automations" }]} />
      <AutomationsClient automations={automations} canCreate={canCreate} limit={limits.automations} currentCount={currentCount} planLabel={limits.label} />
    </>
  );
}
