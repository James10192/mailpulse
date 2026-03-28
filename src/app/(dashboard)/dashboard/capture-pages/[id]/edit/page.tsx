import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { FormBuilder } from "./form-builder";

export default async function CapturePageEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { org } = await getCurrentUserAndOrg();
  if (!org) notFound();

  const page = await prisma.capturePage.findUnique({
    where: { id, organizationId: org.id },
    select: {
      id: true,
      name: true,
      slug: true,
      fields: true,
      buttonLabel: true,
      successMessage: true,
    },
  });

  if (!page) notFound();

  return (
    <>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Pages de capture", href: "/dashboard/capture-pages" },
          { label: page.name, href: `/dashboard/capture-pages/${page.id}` },
          { label: "Editer" },
        ]}
      />
      <FormBuilder
        pageId={page.id}
        slug={page.slug}
        initialFields={page.fields as Array<{ name: string; type: string; required: boolean; label: string }>}
        initialButtonLabel={page.buttonLabel}
        initialSuccessMessage={page.successMessage}
      />
    </>
  );
}
