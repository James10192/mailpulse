import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SnippetEditor } from "./snippet-editor";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";

export default async function EditSnippetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getCurrentUserAndOrg();
  if (!ctx.org) notFound();

  const [snippet, allSnippets] = await Promise.all([
    prisma.emailTemplate.findUnique({
      where: { id, organizationId: ctx.org.id },
      select: { id: true, name: true, description: true, htmlContent: true, channel: true, whatsappImageUrl: true, whatsappImageName: true },
    }),
    prisma.emailTemplate.findMany({
      where: { organizationId: ctx.org.id, category: "snippet", id: { not: id } },
      select: { id: true, name: true, htmlContent: true, channel: true, whatsappImageUrl: true, whatsappImageName: true },
      take: 50,
    }),
  ]);

  if (!snippet) notFound();

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Campagnes", href: "/dashboard/campaigns" }, { label: "Snippets", href: "/dashboard/snippets" }, { label: "Édition" }]} />
      <SnippetEditor
        snippet={{
          ...snippet,
          channel: snippet.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
        }}
        snippets={allSnippets.map((item) => ({
          ...item,
          channel: item.channel === "WHATSAPP" ? "WHATSAPP" : "EMAIL",
        }))}
      />
    </>
  );
}
