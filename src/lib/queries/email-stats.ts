import { prisma } from "@/lib/prisma";

export async function getEmailEventStats() {
  const [totalEvents, openEvents, clickEvents, bounceEvents] = await Promise.all([
    prisma.emailEvent.count(),
    prisma.emailEvent.count({ where: { type: "OPENED" } }),
    prisma.emailEvent.count({ where: { type: "CLICKED" } }),
    prisma.emailEvent.count({ where: { type: { in: ["BOUNCED_HARD", "BOUNCED_SOFT"] } } }),
  ]);

  const delivered = totalEvents > 0 ? totalEvents : 1;
  return {
    totalEvents,
    openRate: ((openEvents / delivered) * 100).toFixed(1),
    clickRate: ((clickEvents / delivered) * 100).toFixed(1),
    bounceRate: ((bounceEvents / delivered) * 100).toFixed(1),
  };
}
