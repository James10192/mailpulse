import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { MessagingClient } from "./messaging-client";
import { isConfigured } from "@/lib/whatsapp-baileys";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";

export default async function MessagingPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;
  const canManage = ctx.org ? canAccessFeature(ctx.org.plan as PlanTier, "whatsapp") : false;

  const [contactsWithPhone, contactOptions, tags, org] = orgId
    ? await Promise.all([
        prisma.contact.count({
          where: { organizationId: orgId, subscribed: true, phone: { not: null } },
        }),
        prisma.contact.findMany({
          where: { organizationId: orgId, subscribed: true, phone: { not: null } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
          orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
          take: 50,
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
    : [0, [], [], null];

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
        contactOptions={contactOptions.map((contact) => ({
          id: contact.id,
          email: contact.email,
          firstName: contact.firstName,
          lastName: contact.lastName,
          phone: contact.phone ?? "",
        }))}
        availableTags={tags.map((t) => t.name)}
        whatsappEnabled={org?.whatsappEnabled ?? false}
        whatsappMode={org?.whatsappMode ?? "BAILEYS"}
        whatsappPhone={org?.whatsappPhone ?? null}
        evoInstanceName={org?.evoInstanceName ?? null}
        evoStatus={org?.evoInstanceStatus ?? null}
        metaConfigured={!!(org?.metaPhoneNumberId)}
        baileysAvailable={isConfigured()}
        mailpulseWhatsAppAvailable={process.env.MAILPULSE_MANAGED_WHATSAPP_ENABLED === "true"}
        canManage={canManage}
      />
    </>
  );
}
