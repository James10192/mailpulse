import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";
import { enforcePlanLimits } from "@/lib/plan-enforcement";
import { AutomationsClient } from "./automations-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getAutomations(organizationId: string) {
  const automations = await prisma.automation.findMany({
    where: { organizationId },
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
  const { org } = await getCurrentUserAndOrg();
  if (!org) notFound();

  const automations = await getAutomations(org.id);
  const plan = org.plan as PlanTier;
  const limits = PLAN_LIMITS[plan];

  // Auto-enforce: pause excess automations on page load if over limit
  const activeCount = automations.filter((a) => a.status === "ACTIVE").length;
  if (limits.automations !== -1 && activeCount > limits.automations) {
    await enforcePlanLimits(org.id, plan);
    // Re-fetch after enforcement
    const refreshed = await getAutomations(org.id);
    const refreshedCount = refreshed.filter((a) => a.status !== "ARCHIVED").length;
    return (
      <>
        <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Automations" }]} />
        <AutomationsClient
          automations={refreshed}
          canCreate={limits.automations === -1 || refreshedCount < limits.automations}
          limit={limits.automations}
          currentCount={refreshedCount}
          planLabel={limits.label}
          overLimit={limits.automations !== -1 && refreshedCount > limits.automations}
        />
      </>
    );
  }

  const currentCount = automations.filter((a) => a.status !== "ARCHIVED").length;
  const canCreate = limits.automations === -1 || currentCount < limits.automations;
  const overLimit = limits.automations !== -1 && currentCount > limits.automations;

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Automations" }]} />
      <AutomationsClient
        automations={automations}
        canCreate={canCreate}
        limit={limits.automations}
        currentCount={currentCount}
        planLabel={limits.label}
        overLimit={overLimit}
      />
    </>
  );
}
