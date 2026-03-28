import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { FieldsClient } from "./fields-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getFields(orgId: string) {
  const fields = await prisma.customField.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      label: true,
      type: true,
      required: true,
      createdAt: true,
    },
  });
  return fields.map((f) => ({
    ...f,
    createdAt: f.createdAt.toISOString(),
  }));
}

export default async function FieldsPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;
  const fields = orgId ? await getFields(orgId) : [];

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Contacts", href: "/dashboard/contacts" }, { label: "Champs" }]} />
      <FieldsClient fields={fields} />
    </>
  );
}
