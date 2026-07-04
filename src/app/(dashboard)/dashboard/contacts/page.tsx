import { prisma } from "@/lib/prisma";
import { ContactsClient } from "./contacts-client";
import { Breadcrumb } from "@/components/dashboard/breadcrumb";
import { getCurrentUserAndOrg } from "@/lib/queries/get-current-context";
import { PLAN_LIMITS, type PlanTier } from "@/lib/plans";

async function getContactStats(orgId: string) {
  const [total, subscribed] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.contact.count({ where: { organizationId: orgId, subscribed: true } }),
  ]);
  return { total, subscribed, unsubscribed: total - subscribed };
}

async function getContacts(orgId: string) {
  const contacts = await prisma.contact.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { tags: true },
  });
  return contacts.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    lastEngagedAt: c.lastEngagedAt?.toISOString() ?? null,
  }));
}

export default async function ContactsPage() {
  const ctx = await getCurrentUserAndOrg();
  const orgId = ctx.org?.id;
  const [stats, contacts] = orgId
    ? await Promise.all([getContactStats(orgId), getContacts(orgId)])
    : [{ total: 0, subscribed: 0, unsubscribed: 0 }, []];

  const plan = (ctx.org?.plan ?? "FREE") as PlanTier;
  const limits = PLAN_LIMITS[plan];
  const canCreate = limits.contacts === -1 || stats.total < limits.contacts;
  const overLimit = limits.contacts !== -1 && stats.total > limits.contacts;

  return (
    <>
      <Breadcrumb items={[{ label: "", href: "/dashboard" }, { label: "Contacts" }]} />
      <ContactsClient
        stats={stats}
        contacts={contacts}
        canCreate={canCreate}
        limit={limits.contacts}
        currentCount={stats.total}
        planLabel={limits.label}
        overLimit={overLimit}
      />
    </>
  );
}
