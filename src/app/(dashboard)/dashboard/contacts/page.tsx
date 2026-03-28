import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ContactsClient } from "./contacts-client";

async function getContactStats() {
  const [total, subscribed, unsubscribed] = await Promise.all([
    prisma.contact.count(),
    prisma.contact.count({ where: { subscribed: true } }),
    prisma.contact.count({ where: { subscribed: false } }),
  ]);
  return { total, subscribed, unsubscribed };
}

async function getContacts() {
  const contacts = await prisma.contact.findMany({
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
  const stats = await getContactStats();
  const contacts = await getContacts();

  return <ContactsClient stats={stats} contacts={contacts} />;
}
