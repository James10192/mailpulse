import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { SendersClient } from "./senders-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

async function getSenders(orgId: string) {
  const senders = await prisma.emailSender.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      replyTo: true,
      isDefault: true,
      createdAt: true,
    },
  });
  return senders.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));
}

export default async function SendersPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;
  const senders = orgId ? await getSenders(orgId) : [];

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Envoi", href: "/dashboard/senders" }, { label: "Expediteurs" }]} />
      <SendersClient senders={senders} />
    </>
  );
}
