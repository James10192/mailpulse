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

  const [campaign, senders, contactLists, subscribedCount] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id, organizationId: org.id },
      select: {
        id: true,
        name: true,
        subject: true,
        previewText: true,
        htmlContent: true,
        status: true,
      },
    }),
    prisma.emailSender.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, email: true, replyTo: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contactList.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, contactCount: true },
      orderBy: { name: "asc" },
    }),
    prisma.contact.count({
      where: { organizationId: org.id, subscribed: true },
    }),
  ]);

  if (!campaign) notFound();

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
        campaign={campaign}
        senders={senders}
        contactLists={contactLists}
        subscribedCount={subscribedCount}
      />
    </>
  );
}
