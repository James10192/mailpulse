import { prisma } from "@/lib/prisma";
import { CampaignsClient } from "./campaigns-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

async function getCampaigns(orgId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      analytics: true,
      contactList: { select: { name: true, contactCount: true } },
      _count: { select: { recipients: true } },
    },
  });
  return campaigns.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    sentAt: c.sentAt?.toISOString() ?? null,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
  }));
}

export default async function CampaignsPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;

  const [campaigns, senders] = orgId
    ? await Promise.all([
        getCampaigns(orgId),
        prisma.emailSender.findMany({
          where: { organizationId: orgId },
          select: { id: true, name: true, email: true },
          orderBy: { createdAt: "asc" },
        }),
      ])
    : [[], []];

  const plan = (ctx.org?.plan ?? "FREE") as PlanTier;
  const limits = PLAN_LIMITS[plan];
  const activeCampaigns = campaigns.filter((c) =>
    ["SENDING", "SCHEDULED"].includes(c.status)
  ).length;
  const canCreate =
    limits.activeCampaigns === -1 || activeCampaigns < limits.activeCampaigns;
  const overLimit =
    limits.activeCampaigns !== -1 && activeCampaigns > limits.activeCampaigns;

  return (
    <>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Campagnes" },
        ]}
      />
      <CampaignsClient
        campaigns={campaigns}
        senders={senders}
        canCreate={canCreate}
        limit={limits.activeCampaigns}
        currentCount={activeCampaigns}
        planLabel={limits.label}
        overLimit={overLimit}
      />
    </>
  );
}
