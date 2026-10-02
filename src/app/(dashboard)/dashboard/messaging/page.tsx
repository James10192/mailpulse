import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { MessagingClient } from "./messaging-client";
import { isConfigured } from "@/lib/whatsapp-baileys";
import { canAccessFeature, type PlanTier } from "@/lib/plan-catalog";
import { canManageOrganization } from "@/lib/access/roles";
import { APPLICATION_WHATSAPP_ACCOUNTS, senderAccountLabel } from "@/lib/messaging/whatsapp-sender";

export default async function MessagingPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;
  const canManage = ctx.org ? canAccessFeature(ctx.org.plan as PlanTier, "whatsapp") : false;
  // Every member may send; only managers choose the number that speaks.
  const canConfigure = canManage && canManageOrganization({ memberRole: ctx.memberRole, isPlatformAdmin: ctx.isPlatformAdmin });

  const senderAccounts = orgId
    ? await prisma.providerAccount.findMany({
        where: { organizationId: orgId, active: true, application: { is: { active: true } }, ...APPLICATION_WHATSAPP_ACCOUNTS.where },
        orderBy: [{ application: { name: "asc" } }, { createdAt: "asc" }],
        select: { ...APPLICATION_WHATSAPP_ACCOUNTS.select, application: { select: { name: true } } },
      })
    : [];

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
        canConfigure={canConfigure}
        senderOptions={senderAccounts.map((account) => ({
          id: account.id,
          label: `${account.application?.name ?? "Application"} · ${senderAccountLabel(account)}`,
        }))}
      />
    </>
  );
}
