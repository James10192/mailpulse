import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { SendCampaignClient } from "./send-campaign-client";

export default async function SendCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { org } = await getCurrentUserAndOrg();
  if (!org) notFound();

  const [campaign, senders, subscribedCount, tags, segments] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id, organizationId: org.id },
      select: {
        id: true,
        name: true,
        subject: true,
        previewText: true,
        htmlContent: true,
        channel: true,
        status: true,
      },
    }),
    prisma.emailSender.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, email: true, replyTo: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.count({
      where: { organizationId: org.id, subscribed: true },
    }),
    prisma.contactTag.findMany({
      where: { contact: { organizationId: org.id } },
      select: { name: true },
      distinct: ["name"],
      orderBy: { name: "asc" },
    }),
    prisma.contactList.findMany({
      where: { organizationId: org.id, type: "dynamic" },
      select: { id: true, name: true, contactCount: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!campaign) notFound();

  const recipientCount = campaign.channel === "WHATSAPP" || campaign.channel === "SMS"
    ? await prisma.contact.count({
        where: { organizationId: org.id, subscribed: true, phone: { not: null } },
      })
    : subscribedCount;

  return (
    <>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Campagnes", href: "/dashboard/campaigns" },
          { label: campaign.name },
          { label: "Envoyer" },
        ]}
      />
      <SendCampaignClient
        campaign={{
          ...campaign,
          channel: campaign.channel,
        }}
        senders={senders}
        subscribedCount={recipientCount}
        availableTags={tags.map((t) => t.name)}
        availableSegments={segments}
      />
    </>
  );
}
