import type { CommunicationChannel, MessageStatus, Prisma } from "@/generated/prisma";
import {
  MESSAGE_STATUSES,
  isMessageOutcome,
  statusesForOutcome,
  type MessageOutcome,
  type MessageStatusCode,
} from "@/lib/mailpulse/message-outcomes";

export const MESSAGE_PERIODS = {
  "24h": { label: "Dernières 24 heures", hours: 24 },
  "7d": { label: "7 derniers jours", hours: 24 * 7 },
  "30d": { label: "30 derniers jours", hours: 24 * 30 },
  "90d": { label: "90 derniers jours", hours: 24 * 90 },
  all: { label: "Depuis le début", hours: null },
} as const;
export type MessagePeriod = keyof typeof MESSAGE_PERIODS;
const DEFAULT_PERIOD: MessagePeriod = "30d";

const CHANNELS = new Set(["email", "whatsapp", "sms"]);
const ORIGINS = new Set(["api", "platform", "legacy"]);

export type MessageFilters = {
  query: string;
  channel: string;
  origin: string;
  /** An outcome group. `status` below narrows to one exact status, kept for older links. */
  outcome: MessageOutcome | "";
  status: string;
  key: string;
  period: MessagePeriod;
  page: number;
};

function readValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeMessageFilters(searchParams: Record<string, string | string[] | undefined>): MessageFilters {
  const channel = readValue(searchParams.channel).toLowerCase();
  const origin = readValue(searchParams.origin).toLowerCase();
  const outcome = readValue(searchParams.outcome).toLowerCase();
  const status = readValue(searchParams.status).toUpperCase();
  const period = readValue(searchParams.period);

  return {
    query: readValue(searchParams.query).slice(0, 160),
    channel: CHANNELS.has(channel) ? channel : "",
    origin: ORIGINS.has(origin) ? origin : "",
    outcome: isMessageOutcome(outcome) ? outcome : "",
    status: status in MESSAGE_STATUSES ? status.toLowerCase() : "",
    key: readValue(searchParams.key).slice(0, 64),
    period: period in MESSAGE_PERIODS ? (period as MessagePeriod) : DEFAULT_PERIOD,
    page: Math.max(1, Number.parseInt(readValue(searchParams.page), 10) || 1),
  };
}

export function periodStart(period: MessagePeriod, now: Date) {
  const hours = MESSAGE_PERIODS[period].hours;
  return hours === null ? null : new Date(now.getTime() - hours * 60 * 60 * 1000);
}

/**
 * The registry query. `withStatus: false` drops the outcome and status filters,
 * so the outcome counters above the table always show every outcome of the
 * current selection instead of zeroing the ones not selected.
 */
export function buildMessageWhere(
  organizationId: string,
  filters: MessageFilters,
  now: Date,
  { withStatus = true }: { withStatus?: boolean } = {},
): Prisma.CommunicationMessageWhereInput {
  const conditions: Prisma.CommunicationMessageWhereInput[] = [
    // Campaign messages live in their own space.
    { OR: [{ origin: "API" }, { origin: "PLATFORM" }, { origin: null }] },
  ];

  if (filters.origin === "api") conditions.push({ origin: "API" });
  if (filters.origin === "platform") conditions.push({ origin: "PLATFORM" });
  if (filters.origin === "legacy") conditions.push({ origin: null });
  if (filters.channel) conditions.push({ channel: filters.channel.toUpperCase() as CommunicationChannel });
  if (filters.key) conditions.push({ apiKeyId: filters.key });

  const since = periodStart(filters.period, now);
  if (since) conditions.push({ createdAt: { gte: since } });

  if (withStatus) {
    if (filters.outcome) conditions.push({ status: { in: statusesForOutcome(filters.outcome) as MessageStatus[] } });
    if (filters.status) conditions.push({ status: filters.status.toUpperCase() as MessageStatusCode as MessageStatus });
  }

  if (filters.query) {
    conditions.push({
      OR: [
        { recipientValue: { contains: filters.query, mode: "insensitive" } },
        { providerMessageId: { contains: filters.query, mode: "insensitive" } },
        { id: filters.query },
        { contact: { is: { OR: [{ email: { contains: filters.query, mode: "insensitive" } }, { firstName: { contains: filters.query, mode: "insensitive" } }, { lastName: { contains: filters.query, mode: "insensitive" } }] } } },
      ],
    });
  }

  return { organizationId, AND: conditions };
}

/** Counts per outcome from a `groupBy status`. */
export function countByOutcome(rows: { status: string; _count: { _all: number } }[]) {
  const counts: Record<MessageOutcome, number> = { delivered: 0, sent: 0, pending: 0, failed: 0, closed: 0 };
  for (const row of rows) {
    const outcome = MESSAGE_STATUSES[row.status as MessageStatusCode]?.outcome;
    if (outcome) counts[outcome] += row._count._all;
  }
  return counts;
}
