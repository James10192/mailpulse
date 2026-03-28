import { prisma } from "@/lib/prisma";
import { CampaignsClient } from "./campaigns-client";

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
  const campaigns = await getCampaigns();
  return <CampaignsClient campaigns={campaigns} />;
}
