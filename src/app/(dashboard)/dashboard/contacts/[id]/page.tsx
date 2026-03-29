import { prisma } from "@/lib/prisma";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { notFound } from "next/navigation";
import { ContactDetail } from "./contact-detail";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { org } = await getCurrentUserAndOrg();
  if (!org) notFound();

  const [contact, activeAutomations, customFields] = await Promise.all([
    prisma.contact.findUnique({
      where: { id, organizationId: org.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        subscribed: true,
        engagementScore: true,
        metadata: true,
        source: true,
        createdAt: true,
        updatedAt: true,
        tags: { select: { id: true, name: true, color: true } },
        campaignRecipients: {
          select: {
            id: true,
            sentAt: true,
            deliveredAt: true,
            openedAt: true,
            clickedAt: true,
            bouncedAt: true,
            campaign: { select: { id: true, name: true, subject: true } },
          },
          orderBy: { sentAt: "desc" },
          take: 20,
        },
        emailEvents: {
          select: { id: true, type: true, metadata: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    }),
    prisma.automation.findMany({
      where: { organizationId: org.id, status: "ACTIVE" },
      select: { id: true, name: true, trigger: true },
    }),
    prisma.customField.findMany({
      where: { organizationId: org.id },
      select: { id: true, name: true, label: true, type: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!contact) notFound();

  // Compute stats
  const totalEmails = contact.campaignRecipients.length;
  const delivered = contact.campaignRecipients.filter((r) => r.deliveredAt).length;
  const opened = contact.campaignRecipients.filter((r) => r.openedAt).length;
  const clicked = contact.campaignRecipients.filter((r) => r.clickedAt).length;
  const bounced = contact.campaignRecipients.filter((r) => r.bouncedAt).length;
  const spam = contact.emailEvents.filter((e) => e.type === "COMPLAINED").length;
  const openRate = delivered > 0 ? Math.round((opened / delivered) * 100) : 0;
  const clickRate = delivered > 0 ? Math.round((clicked / delivered) * 100) : 0;

  // Serialize dates to ISO strings for client component
  const serializedContact = {
    ...contact,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
    campaignRecipients: contact.campaignRecipients.map((r) => ({
      ...r,
      sentAt: r.sentAt?.toISOString() ?? null,
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      openedAt: r.openedAt?.toISOString() ?? null,
      clickedAt: r.clickedAt?.toISOString() ?? null,
      bouncedAt: r.bouncedAt?.toISOString() ?? null,
    })),
    emailEvents: contact.emailEvents.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
  };

  return (
    <>
      <Breadcrumb
        items={[
          { label: "", href: "/dashboard" },
          { label: "Contacts", href: "/dashboard/contacts" },
          { label: contact.email },
        ]}
      />
      <ContactDetail
        contact={serializedContact}
        stats={{ totalEmails, openRate, clickRate, bounced, spam }}
        activeAutomations={activeAutomations}
        customFields={customFields}
      />
    </>
  );
}
