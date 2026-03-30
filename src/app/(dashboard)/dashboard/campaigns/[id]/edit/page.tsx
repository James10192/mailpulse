import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { CampaignEditor } from "./campaign-editor";
import { notFound } from "next/navigation";

export default async function CampaignEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUserAndOrg();
  if (!ctx.org) notFound();

  const [campaign, snippets] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id, organizationId: ctx.org.id },
      select: {
        id: true,
        name: true,
        subject: true,
        previewText: true,
        htmlContent: true,
        status: true,
      },
    }),
    prisma.emailTemplate.findMany({
      where: { organizationId: ctx.org.id, category: "snippet" },
      select: { id: true, name: true, htmlContent: true },
      orderBy: { name: "asc" },
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
        ]}
      />
      <CampaignEditor
        campaign={{
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject ?? "",
          previewText: campaign.previewText ?? "",
          htmlContent: campaign.htmlContent ?? "",
          status: campaign.status,
        }}
        snippets={snippets}
      />
    </>
  );
}
