import { prisma } from "@/lib/prisma";
import { TagsClient } from "./tags-client";

async function getTags() {
  const tags = await prisma.contactTag.groupBy({
    by: ["name"],
    _count: { id: true },
  });
  return tags.map((t) => ({ name: t.name, count: t._count.id }));
}

export default async function TagsPage() {
  const tags = await getTags();
  return <TagsClient tags={tags} />;
}
