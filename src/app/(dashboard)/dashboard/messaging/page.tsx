import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { MessagingClient } from "./messaging-client";
import { isMasterConfigured } from "@/lib/twilio";

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
            smsEnabled: true,
            twilioPhoneNumber: true,
            twilioWhatsappNumber: true,
          },
        }),
      ])
    : [0, [], null];

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
        smsEnabled={org?.smsEnabled ?? false}
        phoneNumber={org?.twilioPhoneNumber ?? null}
        whatsappNumber={org?.twilioWhatsappNumber ?? null}
        masterConfigured={isMasterConfigured()}
      />
    </>
  );
}
