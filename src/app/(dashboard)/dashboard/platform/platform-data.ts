// What each tab of the platform page reads. A tab loads only its own data:
// opening the overview never lists messages, opening the registry never
// reads the keys' webhooks.

import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { serializeMessage } from "@/lib/mailpulse/serializers";
import { APPLICATION_WHATSAPP_ACCOUNTS, senderAccountLabel, senderSnapshotLabel, summarizeWhatsAppSender } from "@/lib/messaging/whatsapp-sender";
import { presentRegistryMessage } from "@/lib/platform/message-privacy";
import { buildMessageWhere, ORGANIZATION_SENDER_FILTER, type MessageFilters } from "./message-filters";
import type { ApiMessageDetail } from "./message-types";

export const PAGE_SIZE = 25;
const KEY_ACTIVITY_DAYS = 30;
const VOLUME_DAYS = 14;
const IDENTIFIER = /^[a-z0-9_-]{1,64}$/i;
const compactDateFormatter = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" });

const MESSAGE_INCLUDE = {
  contact: { select: { email: true, phone: true, firstName: true, lastName: true } },
  template: { select: { templateKey: true, name: true, providerTemplateId: true } },
  apiKey: { select: { id: true, name: true, environment: true, revokedAt: true } },
  webhookDeliveries: { orderBy: { createdAt: "desc" as const }, take: 5, include: { endpoint: { select: { name: true } } } },
} satisfies Prisma.CommunicationMessageInclude;

type RegistryMessage = Prisma.CommunicationMessageGetPayload<{ include: typeof MESSAGE_INCLUDE }>;

function toDetail(message: RegistryMessage, canSeePersonalData: boolean): ApiMessageDetail {
  return presentRegistryMessage(
    {
      ...serializeMessage(message),
      sender: senderSnapshotLabel(message.senderSnapshot),
      origin: message.origin === "API" ? "api" : message.origin === "PLATFORM" ? "platform" : "legacy",
      api_key: message.apiKey ? { id: message.apiKey.id, name: message.apiKey.name, environment: message.apiKey.environment, revoked: Boolean(message.apiKey.revokedAt) } : null,
      contact: message.contact ? { email: message.contact.email, phone: message.contact.phone, first_name: message.contact.firstName, last_name: message.contact.lastName } : null,
      template: message.template ? { key: message.template.templateKey, name: message.template.name, provider_template_id: message.template.providerTemplateId } : null,
      webhook_deliveries: message.webhookDeliveries.map((delivery) => ({ id: delivery.id, endpoint_name: delivery.endpoint.name, event_type: delivery.eventType, status: delivery.status, attempts: delivery.attempts, last_error: delivery.lastError, delivered_at: delivery.deliveredAt?.toISOString() ?? null })),
    },
    canSeePersonalData,
  );
}

/** Messages per UTC day over the last two weeks, counted by the database. */
async function volumeByDay(organizationId: string, now: Date) {
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (VOLUME_DAYS - 1)));
  const rows = await prisma.$queryRaw<{ day: Date; count: number }[]>`
    SELECT date_trunc('day', "createdAt") AS day, count(*)::int AS count
    FROM "communication_message"
    WHERE "organizationId" = ${organizationId}
      AND "createdAt" >= ${since}
      AND ("origin" IS NULL OR "origin" IN ('API', 'PLATFORM'))
    GROUP BY 1
  `;
  const counts = new Map(rows.map((row) => [row.day.toISOString().slice(0, 10), row.count]));
  return Array.from({ length: VOLUME_DAYS }, (_, index) => {
    const date = new Date(since.getTime() + index * 24 * 60 * 60 * 1000);
    return { date: compactDateFormatter.format(date), messages: counts.get(date.toISOString().slice(0, 10)) ?? 0 };
  });
}

export async function loadMessagesTab(organizationId: string, filters: MessageFilters, options: { now: Date; canSeePersonalData: boolean; messageId: string | null }) {
  const { now, canSeePersonalData } = options;
  const messageWhere = buildMessageWhere(organizationId, filters, now, { personalSearch: canSeePersonalData });
  const outcomeWhere = buildMessageWhere(organizationId, filters, now, { withStatus: false, personalSearch: canSeePersonalData });
  const allTime = buildMessageWhere(organizationId, { ...filters, query: "", channel: "", origin: "", outcome: "", status: "", key: "", application: "", sender: "", period: "all", page: 1 }, now);
  const linkedId = options.messageId && IDENTIFIER.test(options.messageId) ? options.messageId : null;

  const [messages, total, outcomeRows, channelCounts, volume, apiKeys, applications, whatsappAccounts, linked] = await Promise.all([
    prisma.communicationMessage.findMany({ where: messageWhere, include: MESSAGE_INCLUDE, orderBy: { createdAt: "desc" }, skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.communicationMessage.count({ where: messageWhere }),
    prisma.communicationMessage.groupBy({ by: ["status"], where: outcomeWhere, _count: { _all: true } }),
    prisma.communicationMessage.groupBy({ by: ["channel", "status"], where: allTime, _count: { _all: true } }),
    volumeByDay(organizationId, now),
    prisma.integrationApiKey.findMany({ where: { organizationId, provider: "MAILPULSE" }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, name: true, revokedAt: true } }),
    prisma.externalApplication.findMany({ where: { organizationId }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.providerAccount.findMany({
      where: { organizationId, ...APPLICATION_WHATSAPP_ACCOUNTS.where },
      orderBy: { createdAt: "asc" },
      select: { id: true, label: true, senderId: true, externalAccountId: true, application: { select: { name: true } } },
    }),
    // A shared link opens its message even when it is not on the current page; scoped to the organization.
    linkedId ? prisma.communicationMessage.findFirst({ where: { AND: [allTime, { id: linkedId }] }, include: MESSAGE_INCLUDE }) : null,
  ]);

  // The organization's number is always an option: every WhatsApp message sent
  // before numbers were pinned left from it, even if WhatsApp is now disabled.
  const senderOptions = [
    { key: ORGANIZATION_SENDER_FILTER, label: "Numéro de l'organisation" },
    ...whatsappAccounts.map((account) => ({ key: account.id, label: account.application ? `${senderAccountLabel(account)} · ${account.application.name}` : senderAccountLabel(account) })),
  ];

  const deliveryData = (["EMAIL", "WHATSAPP", "SMS"] as const).map((channel) => {
    const sum = (statuses: string[]) => channelCounts.filter((item) => item.channel === channel && statuses.includes(item.status)).reduce((total, item) => total + item._count._all, 0);
    return {
      channel: channel === "WHATSAPP" ? "WhatsApp" : channel === "EMAIL" ? "Email" : "SMS",
      queued: sum(["QUEUED", "RETRYING"]),
      delivered: sum(["DELIVERED", "READ", "SENT"]),
      failed: sum(["FAILED", "TEMPLATE_REQUIRED"]),
    };
  });

  return {
    messages: messages.map((message) => toDetail(message, canSeePersonalData)),
    linkedMessage: linked ? toDetail(linked, canSeePersonalData) : null,
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    outcomeRows,
    deliveryData,
    volume,
    keyOptions: apiKeys.map((key) => ({ id: key.id, name: key.name, revoked: Boolean(key.revokedAt) })),
    applicationOptions: applications,
    senderOptions,
  };
}

export async function loadIntegrationsTab(organizationId: string, now: Date) {
  const sinceKeyActivity = new Date(now.getTime() - KEY_ACTIVITY_DAYS * 24 * 60 * 60 * 1000);
  const [apiKeys, keyActivity, templates, webhooks, emailSenders, verifiedDomains, applications] = await Promise.all([
    prisma.integrationApiKey.findMany({ where: { organizationId, provider: "MAILPULSE" }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.communicationMessage.groupBy({ by: ["apiKeyId"], where: { organizationId, apiKeyId: { not: null }, createdAt: { gte: sinceKeyActivity } }, _count: { _all: true } }),
    prisma.communicationTemplate.findMany({ where: { organizationId }, orderBy: { updatedAt: "desc" }, take: 12 }),
    prisma.webhookEndpoint.findMany({ where: { organizationId }, orderBy: { createdAt: "desc" }, take: 12 }),
    prisma.emailSender.findMany({ where: { organizationId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], select: { id: true, name: true, email: true, isDefault: true } }),
    prisma.sendingDomain.findMany({ where: { organizationId, verified: true, status: "verified" }, select: { domain: true } }),
    prisma.externalApplication.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, key: true, active: true, providerAccounts: APPLICATION_WHATSAPP_ACCOUNTS },
    }),
  ]);

  // Same rule as the key actions: a sender is usable only on a verified domain.
  const verifiedDomainSet = new Set(verifiedDomains.map((item) => item.domain.toLowerCase()));
  const recentByKey = new Map(keyActivity.map((row) => [row.apiKeyId, row._count._all]));
  return {
    apiKeys: apiKeys.map((key) => ({ id: key.id, name: key.name, keyPrefix: key.keyPrefix, environment: key.environment, defaultEmailSenderId: key.defaultEmailSenderId, applicationId: key.applicationId, lastUsedAt: key.lastUsedAt?.toISOString() ?? null, createdAt: key.createdAt.toISOString(), revokedAt: key.revokedAt?.toISOString() ?? null, recentMessages: recentByKey.get(key.id) ?? 0 })),
    activeKeys: apiKeys.filter((key) => !key.revokedAt).length,
    templates,
    webhooks,
    activeWebhooks: webhooks.filter((webhook) => webhook.active).length,
    senderOptions: emailSenders.map((sender) => ({ ...sender, verified: verifiedDomainSet.has(sender.email.split("@")[1]?.toLowerCase() ?? "") })),
    // Credentials stay on the server: the client only learns where messages leave from.
    applicationOptions: applications.map((application) => ({ id: application.id, name: application.name, key: application.key, active: application.active, whatsapp: summarizeWhatsAppSender(application.providerAccounts) })),
  };
}
