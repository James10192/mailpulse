// The arithmetic behind the platform overview, kept free of any database so
// that every threshold can be read and tested in one place.
//
// Two rails send messages: the registry (CommunicationMessage, API keys and the
// dashboard) and signed commands from external applications
// (ExternalTransportOperation). Both are brought down to the registry's five
// outcomes, so one number can be counted across both.

import {
  MESSAGE_STATUSES,
  type MessageOutcome,
  type MessageStatusCode,
} from "../mailpulse/message-outcomes";

export type OutcomeCounts = Record<MessageOutcome, number>;

export function emptyCounts(): OutcomeCounts {
  return { delivered: 0, sent: 0, pending: 0, failed: 0, closed: 0 };
}

// Statuses of an outbound ExternalTransportOperation. COMPLETED belongs to
// inbound processing and never reaches an outbound count; it reads as closed.
const OPERATION_OUTCOMES: Record<string, MessageOutcome> = {
  PENDING: "pending",
  PROCESSING: "pending",
  SUBMISSION_UNKNOWN: "pending",
  QUEUED: "pending",
  CONSENT_PENDING: "pending",
  ACCEPTED: "sent",
  DELIVERED: "delivered",
  READ: "delivered",
  REJECTED: "failed",
  FAILED: "failed",
  RECONCILED: "closed",
  DUPLICATE_CONFIRMED: "closed",
  COMPLETED: "closed",
};

/** An unknown status is counted as pending: it is not settled, and it is not hidden. */
export function operationOutcome(status: string): MessageOutcome {
  return OPERATION_OUTCOMES[status] ?? "pending";
}

export function messageOutcome(status: string): MessageOutcome {
  return MESSAGE_STATUSES[status as MessageStatusCode]?.outcome ?? "pending";
}

export type StatusRow = { status: string; count: number };

export function countOutcomes(rows: StatusRow[], read: (status: string) => MessageOutcome, into = emptyCounts()) {
  for (const row of rows) into[read(row.status)] += row.count;
  return into;
}

export function totalOf(counts: OutcomeCounts) {
  return counts.delivered + counts.sent + counts.pending + counts.failed + counts.closed;
}

/** Messages whose fate is known: reached the provider, or refused. Pending and cancelled ones say nothing yet. */
export function settledOf(counts: OutcomeCounts) {
  return counts.delivered + counts.sent + counts.failed;
}

/** Share of settled messages that left. Null when nothing is settled: no rate is better than a false 0 %. */
export function successRate(counts: OutcomeCounts): number | null {
  const settled = settledOf(counts);
  return settled === 0 ? null : (counts.delivered + counts.sent) / settled;
}

export type Comparison = {
  current: number;
  previous: number | null;
  /** Relative change; null without a previous period or when it was zero. */
  change: number | null;
};

export function compare(current: number, previous: number | null): Comparison {
  if (previous === null || previous === 0) return { current, previous, change: null };
  return { current, previous, change: (current - previous) / previous };
}

// ---------------------------------------------------------------------------
// Health

export type HealthState = "healthy" | "degraded" | "failing" | "idle" | "unavailable";

/**
 * Thresholds, on the success rate of settled messages:
 * - at least 95 %: healthy;
 * - at least 80 %: degraded;
 * - below: failing.
 * Under MIN_SAMPLE settled messages a rate means little: one failure out of
 * three would read « failing ». A small sample is at worst « degraded ».
 */
export const HEALTH_THRESHOLDS = { healthy: 0.95, degraded: 0.8, minSample: 10 } as const;

export function healthOf(counts: OutcomeCounts, { available = true }: { available?: boolean } = {}): HealthState {
  if (!available) return "unavailable";
  const settled = settledOf(counts);
  if (settled === 0) return "idle";
  const rate = successRate(counts) ?? 0;
  if (rate >= HEALTH_THRESHOLDS.healthy) return "healthy";
  if (settled < HEALTH_THRESHOLDS.minSample || rate >= HEALTH_THRESHOLDS.degraded) return "degraded";
  return "failing";
}

export const HEALTH_LABELS: Record<HealthState, { label: string; tone: "success" | "warning" | "destructive" | "secondary" | "outline" }> = {
  healthy: { label: "Opérationnel", tone: "success" },
  degraded: { label: "Dégradé", tone: "warning" },
  failing: { label: "En échec", tone: "destructive" },
  idle: { label: "Sans activité", tone: "secondary" },
  unavailable: { label: "Indisponible", tone: "outline" },
};

// ---------------------------------------------------------------------------
// Senders

/** The organization's own number has no account: it is keyed by this constant. */
export const ORGANIZATION_SENDER = "organization";

export type SenderRow = { senderKey: string | null; status: string; count: number };

/**
 * Counts per sending number, across both rails. A registry message without a
 * pinned account was sent from the organization's number; an external
 * operation always has its account.
 */
export function countBySender(messages: SenderRow[], operations: SenderRow[]) {
  const counts = new Map<string, OutcomeCounts>();
  const add = (key: string, outcome: MessageOutcome, count: number) => {
    const entry = counts.get(key) ?? emptyCounts();
    entry[outcome] += count;
    counts.set(key, entry);
  };
  for (const row of messages) add(row.senderKey ?? ORGANIZATION_SENDER, messageOutcome(row.status), row.count);
  for (const row of operations) add(row.senderKey ?? ORGANIZATION_SENDER, operationOutcome(row.status), row.count);
  return counts;
}

// ---------------------------------------------------------------------------
// What changed since the previous period

export type Change = { kind: "failure_rate" | "volume_drop" | "new_failure" | "sender_failing"; tone: "warning" | "destructive"; message: string };

export const CHANGE_THRESHOLDS = {
  /** Points of failure rate gained, out of settled messages. */
  failureRatePoints: 0.05,
  /** Settled messages needed before a rate change is worth saying. */
  minSettled: 20,
  /** Share of volume lost, against a previous period of at least minPreviousVolume. */
  volumeDrop: 0.5,
  minPreviousVolume: 20,
  /** A failure reason absent before needs this many occurrences to be news. */
  newFailureMin: 3,
} as const;

const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

export function detectChanges(input: {
  current: OutcomeCounts;
  previous: OutcomeCounts | null;
  currentFailures: { label: string; count: number }[];
  previousFailures: { label: string; count: number }[] | null;
  failingSenders?: string[];
}): Change[] {
  const changes: Change[] = [];

  for (const sender of input.failingSenders ?? []) {
    changes.push({ kind: "sender_failing", tone: "destructive", message: `Le numéro ${sender} est en échec : moins de ${percent.format(HEALTH_THRESHOLDS.degraded)} de ses envois partent.` });
  }

  if (input.previous) {
    const currentSettled = settledOf(input.current);
    const previousSettled = settledOf(input.previous);
    if (currentSettled >= CHANGE_THRESHOLDS.minSettled && previousSettled >= CHANGE_THRESHOLDS.minSettled) {
      const now = input.current.failed / currentSettled;
      const before = input.previous.failed / previousSettled;
      if (now - before >= CHANGE_THRESHOLDS.failureRatePoints) {
        changes.push({
          kind: "failure_rate",
          tone: now >= 1 - HEALTH_THRESHOLDS.degraded ? "destructive" : "warning",
          message: `Le taux d'échec passe de ${percent.format(before)} à ${percent.format(now)}.`,
        });
      }
    }

    const currentVolume = totalOf(input.current);
    const previousVolume = totalOf(input.previous);
    if (previousVolume >= CHANGE_THRESHOLDS.minPreviousVolume && currentVolume <= previousVolume * (1 - CHANGE_THRESHOLDS.volumeDrop)) {
      changes.push({
        kind: "volume_drop",
        tone: "warning",
        message: `Le volume baisse de ${percent.format(1 - currentVolume / previousVolume)} : ${currentVolume.toLocaleString("fr-FR")} messages contre ${previousVolume.toLocaleString("fr-FR")}.`,
      });
    }
  }

  if (input.previousFailures) {
    const before = new Set(input.previousFailures.filter((row) => row.count > 0).map((row) => row.label));
    for (const failure of input.currentFailures) {
      if (failure.count >= CHANGE_THRESHOLDS.newFailureMin && !before.has(failure.label)) {
        changes.push({ kind: "new_failure", tone: "warning", message: `Nouvelle cause d'échec : ${failure.label} (${failure.count.toLocaleString("fr-FR")}).` });
      }
    }
  }

  return changes;
}

// ---------------------------------------------------------------------------
// Periods

export const OVERVIEW_PERIODS = {
  "24h": { label: "24 heures", hours: 24 },
  "7d": { label: "7 jours", hours: 24 * 7 },
  "30d": { label: "30 jours", hours: 24 * 30 },
} as const;
export type OverviewPeriod = keyof typeof OVERVIEW_PERIODS;

export function readOverviewPeriod(value: unknown): OverviewPeriod {
  return typeof value === "string" && value in OVERVIEW_PERIODS ? (value as OverviewPeriod) : "7d";
}

/** The period and the one just before it, of the same length. */
export function overviewWindows(period: OverviewPeriod, now: Date) {
  const length = OVERVIEW_PERIODS[period].hours * 60 * 60 * 1000;
  const currentFrom = new Date(now.getTime() - length);
  return {
    current: { from: currentFrom, to: now },
    previous: { from: new Date(currentFrom.getTime() - length), to: currentFrom },
  };
}

// ---------------------------------------------------------------------------
// The organization's own number

export type OrganizationWhatsApp = {
  whatsappEnabled: boolean;
  whatsappMode: "META" | "BAILEYS";
  evoInstanceName: string | null;
  evoInstanceStatus: string | null;
  metaPhoneNumberId: string | null;
  metaAccessToken: string | null;
};

/**
 * Whether the organization's own number can send now. The Evolution status is
 * the last one recorded: a known « close » or « connecting » means it cannot,
 * an unknown status is given the benefit of the doubt.
 */
export function organizationWhatsAppAvailable(organization: OrganizationWhatsApp) {
  if (!organization.whatsappEnabled) return false;
  if (organization.whatsappMode === "META") return Boolean(organization.metaPhoneNumberId && organization.metaAccessToken);
  if (!organization.evoInstanceName) return false;
  return organization.evoInstanceStatus === null || organization.evoInstanceStatus === "open";
}
