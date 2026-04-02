import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { MessagingClient } from "./messaging-client";
import { isConfigured } from "@/lib/whatsapp-baileys";

export default async function MessagingPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;

  const [contactsWithPhone, tags, org] = orgId
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
        prisma.organization.findUnique({
          where: { id: orgId },
          select: {
            whatsappEnabled: true,
            whatsappMode: true,
            whatsappPhone: true,
            evoInstanceName: true,
            evoInstanceStatus: true,
            metaPhoneNumberId: true,
          },
        }),
      ])
    : [0, [], null];

  return (
    <>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "WhatsApp" },
        ]}
      />
      <MessagingClient
        contactsWithPhone={contactsWithPhone}
        availableTags={tags.map((t) => t.name)}
        whatsappEnabled={org?.whatsappEnabled ?? false}
        whatsappMode={org?.whatsappMode ?? "BAILEYS"}
        whatsappPhone={org?.whatsappPhone ?? null}
        evoInstanceName={org?.evoInstanceName ?? null}
        evoStatus={org?.evoInstanceStatus ?? null}
        metaConfigured={!!(org?.metaPhoneNumberId)}
        baileysAvailable={isConfigured()}
      />
    </>
  );
}
