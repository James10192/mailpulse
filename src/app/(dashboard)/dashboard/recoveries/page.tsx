import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { RecoveriesClient } from "./recoveries-client";

export default async function RecoveriesPage() {
  const { org } = await getCurrentUserAndOrg();
  const recoveries = org
    ? await prisma.filonRecovery.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          filonOpportunityId: true,
          clientName: true,
          clientEmail: true,
          opportunityTitle: true,
          amountDue: true,
          currency: true,
          dueDate: true,
          status: true,
          nextReminderAt: true,
          lastReminderAt: true,
          contactId: true,
        },
      })
    : [];

  const counts = recoveries.reduce<Record<string, number>>((acc, recovery) => {
    acc[recovery.status] = (acc[recovery.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Recouvrements" }]} />
      <RecoveriesClient
        chartData={Object.entries(counts).map(([status, count]) => ({
          status: status.toLowerCase(),
          count,
        }))}
        recoveries={recoveries.map((recovery) => ({
          ...recovery,
          amountDue: recovery.amountDue.toString(),
          dueDate: recovery.dueDate.toISOString(),
          nextReminderAt: recovery.nextReminderAt?.toISOString() ?? null,
          lastReminderAt: recovery.lastReminderAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
