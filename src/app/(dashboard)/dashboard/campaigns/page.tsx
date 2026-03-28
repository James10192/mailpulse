import { prisma } from "@/lib/prisma";
import { CampaignsClient } from "./campaigns-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

async function getCampaigns() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      analytics: true,
      contactList: { select: { name: true, contactCount: true } },
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
  const [campaigns, ctx] = await Promise.all([
    getCampaigns(),
    getCurrentUserAndOrg(),
  ]);

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
        canCreate={canCreate}
        limit={limits.activeCampaigns}
        currentCount={activeCampaigns}
        planLabel={limits.label}
        overLimit={overLimit}
      />
    </>
  );
}
