import { prisma } from "@/lib/prisma";

export const CHANNEL_LABELS = {
  EMAIL: "Email",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
} as const;

export const STATUS_LABELS = {
  DRAFT: "Brouillon",
  SCHEDULED: "PlanifiÃ©e",
  SENDING: "Envoi",
  SENT: "EnvoyÃ©e",
  PAUSED: "Pause",
  CANCELLED: "AnnulÃ©e",
} as const;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function formatDay(date: Date) {
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export function formatNumber(value: number) {
  return value.toLocaleString("fr-FR");
}

export function formatRate(value: number) {
  return `${value.toFixed(1)}%`;
}

export function percent(part: number, total: number) {
  if (total <= 0) return 0;
  return (part / total) * 100;
}

export async function getDashboardData(orgId: string) {
  const now = new Date();
  const rangeStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13));

  const [
    contactCount,
    subscribedContacts,
    campaigns,
    recentCampaigns,
    messages,
    apiKeys,
    webhookDeliveries,
    openConversations,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId } }),
    prisma.contact.count({ where: { organizationId: orgId, subscribed: true } }),
    prisma.campaign.findMany({
      where: { organizationId: orgId },
      select: { id: true, channel: true, status: true, createdAt: true, analytics: true },
    }),
    prisma.campaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { analytics: true },
    }),
    prisma.communicationMessage.findMany({
      where: { organizationId: orgId, createdAt: { gte: rangeStart } },
      select: {
        channel: true,
        status: true,
        createdAt: true,
        deliveredAt: true,
        readAt: true,
        idempotencyKey: true,
      },
    }),
    prisma.integrationApiKey.findMany({
      where: { organizationId: orgId, provider: "MAILPULSE" },
      select: { id: true, revokedAt: true, lastUsedAt: true },
    }),
    prisma.webhookDelivery.findMany({
      where: { organizationId: orgId, createdAt: { gte: rangeStart } },
      select: { status: true, createdAt: true },
    }),
    prisma.conversation.count({ where: { organizationId: orgId, status: "OPEN" } }),
  ]);

  return {
    contactCount,
    subscribedContacts,
    campaigns,
    recentCampaigns,
    messages,
    apiKeys,
    webhookDeliveries,
    openConversations,
    rangeStart,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;

export function buildVolumeData(messages: DashboardData["messages"], rangeStart: Date) {
  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(rangeStart);
    date.setDate(rangeStart.getDate() + index);
    return { key: date.toISOString().slice(0, 10), date: formatDay(date), email: 0, whatsapp: 0, api: 0 };
  });

  const byDay = new Map(days.map((day) => [day.key, day]));
  for (const message of messages) {
    const day = byDay.get(message.createdAt.toISOString().slice(0, 10));
    if (!day) continue;
    if (message.channel === "EMAIL") day.email += 1;
    if (message.channel === "WHATSAPP") day.whatsapp += 1;
    if (message.idempotencyKey) day.api += 1;
  }

  return days.map((day) => ({ date: day.date, email: day.email, whatsapp: day.whatsapp, api: day.api }));
}

export function buildApiStatusData(messages: DashboardData["messages"]) {
  const rows = [
    { channel: "Email", sent: 0, failed: 0, queued: 0 },
    { channel: "WhatsApp", sent: 0, failed: 0, queued: 0 },
    { channel: "SMS", sent: 0, failed: 0, queued: 0 },
  ];
  const byChannel = new Map(rows.map((row) => [row.channel.toUpperCase(), row]));

  for (const message of messages) {
    const row = byChannel.get(CHANNEL_LABELS[message.channel].toUpperCase());
    if (!row) continue;
    if (message.status === "FAILED" || message.status === "TEMPLATE_REQUIRED") row.failed += 1;
    else if (message.status === "QUEUED" || message.status === "RETRYING") row.queued += 1;
    else row.sent += 1;
  }

  return rows;
}

export function buildCampaignChannelData(campaigns: DashboardData["campaigns"]) {
  const totals = { EMAIL: 0, WHATSAPP: 0, SMS: 0 };
  for (const campaign of campaigns) totals[campaign.channel] += 1;

  return [
    { channel: "Email", value: totals.EMAIL, fill: "#f97316" },
    { channel: "WhatsApp", value: totals.WHATSAPP, fill: "#22c55e" },
    { channel: "SMS", value: totals.SMS, fill: "#71717a" },
  ].filter((item) => item.value > 0);
}

export function getCampaignTotals(campaigns: DashboardData["campaigns"]) {
  return campaigns.reduce(
    (acc, campaign) => {
      acc.total += 1;
      acc[campaign.channel.toLowerCase() as "email" | "whatsapp" | "sms"] += 1;
      if (campaign.status === "SENT") acc.sent += 1;
      if (campaign.status === "SENDING" || campaign.status === "SCHEDULED") acc.active += 1;
      return acc;
    },
    { total: 0, email: 0, whatsapp: 0, sms: 0, sent: 0, active: 0 },
  );
}

export function getMessageTotals(messages: DashboardData["messages"]) {
  return messages.reduce(
    (acc, message) => {
      acc.total += 1;
      if (message.channel === "EMAIL") acc.email += 1;
      if (message.channel === "WHATSAPP") acc.whatsapp += 1;
      if (message.idempotencyKey) acc.api += 1;
      if (message.status === "FAILED" || message.status === "TEMPLATE_REQUIRED") acc.failed += 1;
      if (message.deliveredAt || message.readAt || message.status === "DELIVERED" || message.status === "READ") {
        acc.delivered += 1;
      }
      return acc;
    },
    { total: 0, email: 0, whatsapp: 0, api: 0, failed: 0, delivered: 0 },
  );
}

export function getWebhookTotals(deliveries: DashboardData["webhookDeliveries"]) {
  return deliveries.reduce(
    (acc, delivery) => {
      acc.total += 1;
      if (delivery.status === "DELIVERED") acc.delivered += 1;
      if (delivery.status === "FAILED") acc.failed += 1;
      if (delivery.status === "PENDING" || delivery.status === "RETRYING") acc.pending += 1;
      return acc;
    },
    { total: 0, delivered: 0, failed: 0, pending: 0 },
  );
}
