import { prisma } from "@/lib/prisma";
import { CampaignsClient } from "./campaigns-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

async function getWhatsAppAnalytics(orgId: string, campaign: {
  id: string;
  channel: string;
  createdAt: Date;
  sentAt: Date | null;
}) {
  if (campaign.channel !== "WHATSAPP") return null;

  const recipients = await prisma.campaignRecipient.findMany({
    where: { campaignId: campaign.id },
    select: {
      sentAt: true,
      contactId: true,
    },
  });
  const contactIds = recipients.map((recipient) => recipient.contactId);
  const since = campaign.sentAt ?? campaign.createdAt;

  const [delivered, read, inboundReplies] = await Promise.all([
    prisma.communicationMessage.count({
      where: {
        organizationId: orgId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        status: { in: ["DELIVERED", "READ"] },
        metadata: { path: ["campaignId"], equals: campaign.id },
      },
    }),
    prisma.communicationMessage.count({
      where: {
        organizationId: orgId,
        channel: "WHATSAPP",
        direction: "OUTBOUND",
        status: "READ",
        metadata: { path: ["campaignId"], equals: campaign.id },
      },
    }),
    contactIds.length
      ? prisma.communicationMessage.findMany({
          where: {
            organizationId: orgId,
            channel: "WHATSAPP",
            direction: "INBOUND",
            contactId: { in: contactIds },
            createdAt: { gte: since },
          },
          select: { contactId: true },
          distinct: ["contactId"],
        })
      : Promise.resolve([]),
  ]);

  return {
    sent: recipients.filter((recipient) => recipient.sentAt).length,
    delivered,
    read,
    replied: inboundReplies.length,
  };
}

async function getCampaigns(orgId: string) {
  const campaigns = await prisma.campaign.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      subject: true,
      previewText: true,
      // htmlContent excluded — loaded on-demand in detail panel
      fromName: true,
      fromEmail: true,
      replyTo: true,
      status: true,
      channel: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      sentAt: true,
      scheduledAt: true,
      completedAt: true,
      analytics: true,
      contactList: { select: { name: true, contactCount: true } },
      _count: { select: { recipients: true } },
    },
  });
  return Promise.all(campaigns.map(async (c) => ({
    ...c,
    whatsappAnalytics: await getWhatsAppAnalytics(orgId, c),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    sentAt: c.sentAt?.toISOString() ?? null,
    scheduledAt: c.scheduledAt?.toISOString() ?? null,
    completedAt: c.completedAt?.toISOString() ?? null,
  })));
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
