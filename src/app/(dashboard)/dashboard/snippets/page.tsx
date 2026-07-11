import { prisma } from "@/lib/prisma";
import { SnippetsClient } from "./snippets-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

async function getSnippets(orgId: string) {
  const snippets = await prisma.emailTemplate.findMany({
    where: { organizationId: orgId, category: "snippet" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      description: true,
      htmlContent: true,
      channel: true,
      createdAt: true,
      whatsappImageUrl: true,
      whatsappImageName: true,
    },
  });
  return snippets.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
}

export default async function SnippetsPage() {
  const ctx = await getCurrentUserAndOrg();
  const snippets = ctx.org ? await getSnippets(ctx.org.id) : [];

  const plan = (ctx.org?.plan ?? "FREE") as PlanTier;
  const limits = PLAN_LIMITS[plan];
  const currentCount = snippets.length;
  const canCreate = limits.snippets === -1 || currentCount < limits.snippets;
  const overLimit = limits.snippets !== -1 && currentCount > limits.snippets;

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Campagnes", href: "/dashboard/campaigns" }, { label: "Snippets" }]} />
      <SnippetsClient
        snippets={snippets}
        canCreate={canCreate}
        limit={limits.snippets}
        currentCount={currentCount}
        planLabel={limits.label}
        overLimit={overLimit}
      />
    </>
  );
}
