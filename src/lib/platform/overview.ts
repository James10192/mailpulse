// Reads what the platform overview shows: a few aggregate queries per period,
// never a list of messages. Every figure is computed in overview-metrics.ts.

import type { CommunicationChannel, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { statusesForOutcome } from "@/lib/mailpulse/message-outcomes";
import { senderAccountLabel } from "@/lib/messaging/whatsapp-sender";
import { groupFailures, type FailureGroup } from "./failure-reasons";
import {
  HEALTH_LABELS,
  ORGANIZATION_SENDER,
  compare,
  countBySender,
  countOutcomes,
  detectChanges,
  emptyCounts,
  healthOf,
  messageOutcome,
  operationOutcome,
  organizationWhatsAppAvailable,
  overviewWindows,
  successRate,
  totalOf,
  type Change,
  type Comparison,
  type HealthState,
  type OutcomeCounts,
  type OverviewPeriod,
} from "./overview-metrics";

export const OVERVIEW_CHANNELS = ["EMAIL", "WHATSAPP", "SMS"] as const satisfies readonly CommunicationChannel[];
export type OverviewChannel = (typeof OVERVIEW_CHANNELS)[number];

export type ChannelHealth = {
  channel: OverviewChannel;
  counts: OutcomeCounts;
  volume: Comparison;
  successRate: number | null;
  health: HealthState;
};

export type SenderHealth = {
  key: string;
  label: string;
  application: string | null;
  provider: "META" | "BAILEYS";
  active: boolean;
  counts: OutcomeCounts;
  /** Of those, signed commands: counted here, not listed in the registry. */
  commands: number;
  successRate: number | null;
  health: HealthState;
};

export type PlatformOverview = {
  period: OverviewPeriod;
  totals: { current: OutcomeCounts; previous: OutcomeCounts };
  volume: Comparison;
  /** Null on a side with nothing settled: no rate rather than a false 0 %. */
  successRate: { current: number | null; previous: number | null };
  failed: Comparison;
  /** Signed commands in the figures above; the registry lists messages only. */
  commands: { total: number; failed: number };
  channels: ChannelHealth[];
  failures: FailureGroup[];
  senders: SenderHealth[];
  changes: Change[];
};

type Window = { from: Date; to: Date };

// Campaign messages have their own space; the overview covers direct and API sends.
const REGISTRY_ORIGINS: Prisma.CommunicationMessageWhereInput = { OR: [{ origin: "API" }, { origin: "PLATFORM" }, { origin: null }] };
const FAILED_MESSAGE_STATUSES = statusesForOutcome("failed");
const FAILED_OPERATION_STATUSES = ["REJECTED", "FAILED"];

function registryWhere(organizationId: string, window: Window): Prisma.CommunicationMessageWhereInput {
  return { organizationId, AND: [REGISTRY_ORIGINS], createdAt: { gte: window.from, lt: window.to } };
}

function operationWhere(organizationId: string, window: Window): Prisma.ExternalTransportOperationWhereInput {
  return { organizationId, direction: "OUTBOUND", createdAt: { gte: window.from, lt: window.to } };
}

async function readWindow(organizationId: string, window: Window) {
  const [messages, operations, messageFailures, operationFailures, messageSenders] = await Promise.all([
    prisma.communicationMessage.groupBy({ by: ["channel", "status"], where: registryWhere(organizationId, window), _count: { _all: true } }),
    prisma.externalTransportOperation.groupBy({ by: ["providerAccountId", "status"], where: operationWhere(organizationId, window), _count: { _all: true } }),
    prisma.communicationMessage.groupBy({
      by: ["status", "errorCode"],
      where: { ...registryWhere(organizationId, window), status: { in: FAILED_MESSAGE_STATUSES } },
      _count: { _all: true },
    }),
    prisma.externalTransportOperation.groupBy({
      by: ["rejectionCode"],
      where: { ...operationWhere(organizationId, window), status: { in: FAILED_OPERATION_STATUSES } },
      _count: { _all: true },
    }),
    prisma.communicationMessage.groupBy({
      by: ["senderAccountId", "status"],
      where: { ...registryWhere(organizationId, window), channel: "WHATSAPP" },
      _count: { _all: true },
    }),
  ]);
  return { messages, operations, messageFailures, operationFailures, messageSenders };
}

type WindowRows = Awaited<ReturnType<typeof readWindow>>;

function channelCounts(rows: WindowRows, accountChannels: Map<string, CommunicationChannel>) {
  const byChannel = new Map<OverviewChannel, OutcomeCounts>(OVERVIEW_CHANNELS.map((channel) => [channel, emptyCounts()]));
  for (const row of rows.messages) {
    const counts = byChannel.get(row.channel as OverviewChannel);
    if (counts) counts[messageOutcome(row.status)] += row._count._all;
  }
  for (const row of rows.operations) {
    const counts = byChannel.get((accountChannels.get(row.providerAccountId) ?? "WHATSAPP") as OverviewChannel);
    if (counts) counts[operationOutcome(row.status)] += row._count._all;
  }
  return byChannel;
}

function totals(byChannel: Map<OverviewChannel, OutcomeCounts>) {
  const total = emptyCounts();
  for (const counts of byChannel.values()) {
    for (const outcome of Object.keys(total) as (keyof OutcomeCounts)[]) total[outcome] += counts[outcome];
  }
  return total;
}

function failures(rows: WindowRows) {
  return groupFailures([
    // A message held for want of a template often carries no code of its own.
    ...rows.messageFailures.map((row) => ({ errorCode: row.errorCode ?? (row.status === "TEMPLATE_REQUIRED" ? "whatsapp_template_required" : null), count: row._count._all })),
    ...rows.operationFailures.map((row) => ({ errorCode: row.rejectionCode, count: row._count._all })),
  ]);
}

export async function loadPlatformOverview(organizationId: string, period: OverviewPeriod, now = new Date()): Promise<PlatformOverview> {
  const windows = overviewWindows(period, now);
  const [current, previous, accounts, organization] = await Promise.all([
    readWindow(organizationId, windows.current),
    readWindow(organizationId, windows.previous),
    prisma.providerAccount.findMany({
      where: { organizationId },
      select: { id: true, channel: true, provider: true, active: true, label: true, senderId: true, externalAccountId: true, application: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: { whatsappEnabled: true, whatsappMode: true, whatsappPhone: true, evoInstanceName: true, evoInstanceStatus: true, metaPhoneNumberId: true, metaAccessToken: true, smsEnabled: true },
    }),
  ]);

  const accountChannels = new Map(accounts.map((account) => [account.id, account.channel]));
  const currentByChannel = channelCounts(current, accountChannels);
  const previousByChannel = channelCounts(previous, accountChannels);
  const currentTotals = totals(currentByChannel);
  const previousTotals = totals(previousByChannel);

  const organizationAvailable = organization ? organizationWhatsAppAvailable(organization) : false;
  const whatsappAccounts = accounts.filter((account) => account.channel === "WHATSAPP");
  const channelAvailable: Record<OverviewChannel, boolean> = {
    EMAIL: true,
    WHATSAPP: organizationAvailable || whatsappAccounts.some((account) => account.active),
    SMS: organization?.smsEnabled ?? false,
  };

  const channels = OVERVIEW_CHANNELS.map((channel): ChannelHealth => {
    const counts = currentByChannel.get(channel) ?? emptyCounts();
    return {
      channel,
      counts,
      volume: compare(totalOf(counts), totalOf(previousByChannel.get(channel) ?? emptyCounts())),
      successRate: successRate(counts),
      health: healthOf(counts, { available: channelAvailable[channel] }),
    };
  });

  const bySender = countBySender(
    current.messageSenders.map((row) => ({ senderKey: row.senderAccountId, status: row.status, count: row._count._all })),
    current.operations.filter((row) => accountChannels.get(row.providerAccountId) === "WHATSAPP").map((row) => ({ senderKey: row.providerAccountId, status: row.status, count: row._count._all })),
  );
  const senders: SenderHealth[] = [];
  const organizationCounts = bySender.get(ORGANIZATION_SENDER) ?? emptyCounts();
  if (organization && (organization.whatsappEnabled || totalOf(organizationCounts) > 0)) {
    senders.push({
      key: ORGANIZATION_SENDER,
      label: "Numéro de l'organisation",
      application: null,
      provider: organization.whatsappMode,
      active: organizationAvailable,
      counts: organizationCounts,
      commands: 0,
      successRate: successRate(organizationCounts),
      health: healthOf(organizationCounts, { available: organizationAvailable }),
    });
  }
  for (const account of whatsappAccounts) {
    const counts = bySender.get(account.id) ?? emptyCounts();
    if (!account.active && totalOf(counts) === 0) continue;
    senders.push({
      key: account.id,
      label: senderAccountLabel(account),
      application: account.application?.name ?? null,
      provider: account.provider === "META_WHATSAPP" ? "META" : "BAILEYS",
      active: account.active,
      counts,
      commands: 0,
      successRate: successRate(counts),
      health: healthOf(counts, { available: account.active }),
    });
  }

  const commandCounts = countOutcomes(current.operations.map((row) => ({ status: row.status, count: row._count._all })), operationOutcome);
  const commandsBySender = new Map<string, number>();
  for (const row of current.operations) commandsBySender.set(row.providerAccountId, (commandsBySender.get(row.providerAccountId) ?? 0) + row._count._all);
  for (const sender of senders) sender.commands = commandsBySender.get(sender.key) ?? 0;

  const currentFailures = failures(current);
  return {
    period,
    totals: { current: currentTotals, previous: previousTotals },
    volume: compare(totalOf(currentTotals), totalOf(previousTotals)),
    successRate: { current: successRate(currentTotals), previous: successRate(previousTotals) },
    failed: compare(currentTotals.failed, previousTotals.failed),
    commands: { total: totalOf(commandCounts), failed: commandCounts.failed },
    channels,
    failures: currentFailures,
    senders,
    changes: detectChanges({
      current: currentTotals,
      previous: previousTotals,
      currentFailures,
      previousFailures: failures(previous),
      failingSenders: senders.filter((sender) => sender.health === "failing").map((sender) => sender.label),
    }),
  };
}

export { HEALTH_LABELS };
