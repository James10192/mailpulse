import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SnippetEditor } from "./snippet-editor";

export default async function EditSnippetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [snippet, allSnippets] = await Promise.all([
    prisma.emailTemplate.findUnique({
      where: { id },
      select: { id: true, name: true, description: true, htmlContent: true },
    }),
    prisma.emailTemplate.findMany({
      where: { category: "snippet", id: { not: id } },
      select: { id: true, name: true, htmlContent: true },
      take: 50,
    }),
  ]);

  if (!snippet) notFound();

  return <SnippetEditor snippet={snippet} snippets={allSnippets} />;
}
