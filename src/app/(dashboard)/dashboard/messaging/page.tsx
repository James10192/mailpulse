import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { MessagingClient } from "./messaging-client";

export default async function MessagingPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;

  const [contactsWithPhone, tags] = orgId
    ? await Promise.all([
        prisma.contact.count({
          where: { organizationId: orgId, subscribed: true, phone: { not: null } },
        }),
        prisma.contactTag.findMany({
          where: { contact: { organizationId: orgId } },
          select: { name: true },
          distinct: ["name"],
          orderBy: { name: "asc" },
        }),
      ])
    : [0, []];

  const configured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "SMS & WhatsApp" },
        ]}
      />
      <MessagingClient
        contactsWithPhone={contactsWithPhone}
        availableTags={tags.map((t) => t.name)}
        configured={configured}
      />
    </>
  );
}
