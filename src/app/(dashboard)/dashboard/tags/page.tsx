import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { TagsClient } from "./tags-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getTags(organizationId: string) {
  const tags = await prisma.contactTag.groupBy({
    by: ["name"],
    where: { contact: { organizationId } },
    _count: { id: true },
  });
  return tags.map((t) => ({ name: t.name, count: t._count.id }));
}

export default async function TagsPage() {
  const { org } = await getCurrentUserAndOrg();
  if (!org) notFound();

  const tags = await getTags(org.id);
  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Contacts", href: "/dashboard/contacts" }, { label: "Tags" }]} />
      <TagsClient tags={tags} />
    </>
  );
}
