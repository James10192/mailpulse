import { prisma } from "@/lib/prisma";
import { TagsClient } from "./tags-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getTags() {
  const tags = await prisma.contactTag.groupBy({
    by: ["name"],
    _count: { id: true },
  });
  return tags.map((t) => ({ name: t.name, count: t._count.id }));
}

export default async function TagsPage() {
  const tags = await getTags();
  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Contacts", href: "/dashboard/contacts" }, { label: "Tags" }]} />
      <TagsClient tags={tags} />
    </>
  );
}
