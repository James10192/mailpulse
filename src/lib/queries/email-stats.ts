import { prisma } from "@/lib/prisma";

/** Email event rates of one organization, through the contact each event belongs to. */
export async function getEmailEventStats(organizationId: string) {
  const scope = { contact: { organizationId } };
  const [totalEvents, openEvents, clickEvents, bounceEvents] = await Promise.all([
    prisma.emailEvent.count({ where: scope }),
    prisma.emailEvent.count({ where: { ...scope, type: "OPENED" } }),
    prisma.emailEvent.count({ where: { ...scope, type: "CLICKED" } }),
    prisma.emailEvent.count({ where: { ...scope, type: { in: ["BOUNCED_HARD", "BOUNCED_SOFT"] } } }),
  ]);

  const delivered = totalEvents > 0 ? totalEvents : 1;
  return {
    totalEvents,
    openRate: ((openEvents / delivered) * 100).toFixed(1),
    clickRate: ((clickEvents / delivered) * 100).toFixed(1),
    bounceRate: ((bounceEvents / delivered) * 100).toFixed(1),
  };
}
