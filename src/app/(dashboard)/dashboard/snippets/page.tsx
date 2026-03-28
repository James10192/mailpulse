import { prisma } from "@/lib/prisma";
import { SnippetsClient } from "./snippets-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getSnippets() {
  const snippets = await prisma.emailTemplate.findMany({
    where: { category: "snippet" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, description: true, htmlContent: true, createdAt: true },
  });
  return snippets.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
}

export default async function SnippetsPage() {
  const snippets = await getSnippets();
  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Campagnes", href: "/dashboard/campaigns" }, { label: "Snippets" }]} />
      <SnippetsClient snippets={snippets} />
    </>
  );
}
