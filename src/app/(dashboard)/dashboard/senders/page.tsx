import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { SendersClient } from "./senders-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";

export default async function SendersPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;

  const [senders, domains] = orgId
    ? await Promise.all([
        prisma.emailSender.findMany({
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
        }),
        prisma.sendingDomain.findMany({
          where: { organizationId: orgId },
          select: { domain: true, verified: true },
          orderBy: { domain: "asc" },
        }),
      ])
    : [[], []];

  const serializedSenders = senders.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  // Build domain options: verified domains + resend.dev fallback
  const domainOptions = domains
    .filter((d) => d.verified)
    .map((d) => d.domain);
  if (!domainOptions.includes("resend.dev")) {
    domainOptions.push("resend.dev");
  }

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Envoi", href: "/dashboard/senders" }, { label: "Expediteurs" }]} />
      <SendersClient senders={serializedSenders} domains={domainOptions} />
    </>
  );
}
