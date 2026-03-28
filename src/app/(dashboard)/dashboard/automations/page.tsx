import { prisma } from "@/lib/prisma";
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
  const automations = await getAutomations();
  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Automations" }]} />
      <AutomationsClient automations={automations} />
    </>
  );
}
