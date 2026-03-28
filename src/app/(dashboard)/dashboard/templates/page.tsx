import { prisma } from "@/lib/prisma";
import { TemplatesClient } from "./templates-client";

async function getTemplates() {
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      createdAt: true,
    },
  });
  return templates.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
  }));
}

export default async function TemplatesPage() {
  const templates = await getTemplates();
  return <TemplatesClient templates={templates} />;
}
