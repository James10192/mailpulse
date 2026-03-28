import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { SnippetEditor } from "./snippet-editor";

export default async function EditSnippetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const snippet = await prisma.emailTemplate.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      description: true,
      htmlContent: true,
    },
  });

  if (!snippet) notFound();

  return <SnippetEditor snippet={snippet} />;
}
