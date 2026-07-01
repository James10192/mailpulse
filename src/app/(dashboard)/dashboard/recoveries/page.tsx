import { prisma } from "@/lib/prisma";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { RecoveriesClient } from "./recoveries-client";

export default async function RecoveriesPage() {
  const { org } = await getCurrentUserAndOrg();
  const [recoveries, dueSteps, lastActivity, failedSteps] = org
    ? await Promise.all([
        prisma.filonRecovery.findMany({
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
        }),
        prisma.filonRecoveryStep.count({
          where: {
            status: { in: ["PREPARED", "PENDING"] },
            scheduledAt: { lte: new Date() },
            recovery: { organizationId: org.id, status: { notIn: ["CANCELLED", "COMPLETED"] } },
          },
        }),
        prisma.filonRecoveryStep.findFirst({
          where: { recovery: { organizationId: org.id }, status: { in: ["SENT", "FAILED"] } },
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        }),
        prisma.filonRecoveryStep.findMany({
          where: {
            status: "FAILED",
            recovery: { organizationId: org.id },
          },
          orderBy: { updatedAt: "desc" },
          take: 3,
          select: {
            id: true,
            channel: true,
            errorMessage: true,
            updatedAt: true,
            recovery: {
              select: {
                clientName: true,
                opportunityTitle: true,
              },
            },
          },
        }),
      ])
    : [[], 0, null, []];

  const counts = recoveries.reduce<Record<string, number>>((acc, recovery) => {
    acc[recovery.status] = (acc[recovery.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Recouvrements" }]} />
      <RecoveriesClient
        automation={{
          dueSteps,
          lastRunAt: lastActivity?.updatedAt.toISOString() ?? null,
          errors: failedSteps.map((step) => ({
            id: step.id,
            channel: step.channel,
            message: step.errorMessage ?? "Erreur inconnue pendant la relance.",
            clientName: step.recovery.clientName,
            opportunityTitle: step.recovery.opportunityTitle,
            updatedAt: step.updatedAt.toISOString(),
          })),
        }}
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
