import { prisma } from "@/lib/prisma";
import { SnippetsClient } from "./snippets-client";

async function getSnippets() {
  const snippets = await prisma.emailTemplate.findMany({
    where: { category: "snippet" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, htmlContent: true, createdAt: true },
  });
  return snippets.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));
}

export default async function SnippetsPage() {
  const snippets = await getSnippets();
  return <SnippetsClient snippets={snippets} />;
}
