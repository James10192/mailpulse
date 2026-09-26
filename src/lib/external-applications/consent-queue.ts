import { randomUUID } from "node:crypto";

import { resolveExternalApplicationByOpaqueId, resolveWhatsAppProvider, type ExternalApplicationContext, type ExternalWhatsAppProvider } from "@/lib/external-applications/application";
import { submitOperation } from "@/lib/external-applications/commands";
import { QUEUED_STATUS } from "@/lib/external-applications/consent-hold";
import { CONSENT_EXPIRED_CODE } from "@/lib/external-applications/consent-policy";
import { sendConsentRequest } from "@/lib/external-applications/consent-request";
import { abandonPendingConsent } from "@/lib/external-applications/consent-settlement";
import { recordEventsAfterCommit, recordOperationEvents } from "@/lib/external-applications/events";
import {
  effectiveSenderPacing,
  hasConsentRequestBudget,
  isQuietHour,
  localDayStart,
  pacingDelayMs,
  quietHoursEndAt,
  type SenderPacing,
} from "@/lib/external-applications/pacing-policy";
import { prisma } from "@/lib/prisma";
import { isConfigured as isEvolutionConfigured } from "@/lib/whatsapp-baileys";
import { MAX_SEND_TIMEOUT_MS } from "@/lib/whatsapp/baileys-typing";

/** The `maxDuration` of the cron route that runs this queue. */
const CONSENT_QUEUE_RUN_BUDGET_MS = 60_000;
/**
 * The deadline is only checked before a send, so the last send started must
 * still finish inside the run: its whole timeout is reserved, plus a margin for
 * recording its outcome.
 */
export const CONSENT_QUEUE_DEADLINE_MS = CONSENT_QUEUE_RUN_BUDGET_MS - MAX_SEND_TIMEOUT_MS - 2_000;
const ACCOUNT_LEASE_MS = 2 * 60_000;
/** A request that could not leave within a week is abandoned rather than kept forever. */
const MAX_UNSENT_REQUEST_AGE_MS = 7 * 24 * 60 * 60_000;
const MAX_ACCOUNTS_PER_RUN = 100;
const MAX_EXPIRIES_PER_RUN = 200;
const MAX_PASSES = 20;

type TickResult = "sent" | "idle" | "quiet" | "capped" | "busy" | "skipped";

type AccountRef = { providerAccountId: string; organizationId: string; applicationId: string };

/**
 * One cron run: expire what waited too long, then give every sending account
 * at most its next paced send. A Baileys account never sends twice in one run,
 * since its next slot is at least 15 s away and the run does not sleep.
 */
export async function processConsentQueue(now = new Date(), deadline = Date.now() + CONSENT_QUEUE_DEADLINE_MS) {
  const expired = await expireDueConsents(now);
  const accounts = await accountsWithWork();
  const stats: Record<TickResult, number> = { sent: 0, idle: 0, quiet: 0, capped: 0, busy: 0, skipped: 0 };

  for (let pass = 0; pass < MAX_PASSES && Date.now() < deadline; pass += 1) {
    let progressed = false;
    for (const account of accounts) {
      if (Date.now() >= deadline) break;
      const result = await processAccount(account, new Date());
      stats[result] += 1;
      if (result === "sent") progressed = true;
    }
    if (!progressed) break;
  }
  return { expired, accounts: accounts.length, ...stats };
}

async function expireDueConsents(now: Date) {
  const staleBefore = new Date(now.getTime() - MAX_UNSENT_REQUEST_AGE_MS);
  const due = await prisma.externalRecipientConsent.findMany({
    where: {
      status: "PENDING",
      OR: [{ expiresAt: { lte: now } }, { requestSentAt: null, requestQueuedAt: { lte: staleBefore } }],
    },
    select: { id: true, expiresAt: true, organizationId: true, applicationId: true, providerAccountId: true },
    take: MAX_EXPIRIES_PER_RUN,
  });

  let count = 0;
  for (const consent of due) {
    const guard = consent.expiresAt ? { expiresAt: { lte: now } } : { requestSentAt: null, requestQueuedAt: { lte: staleBefore } };
    const operationIds = await prisma.$transaction((tx) => abandonPendingConsent(tx, consent.id, CONSENT_EXPIRED_CODE, now, guard));
    if (!operationIds) continue;
    count += 1;
    await recordEventsAfterCommit("consent.expired", () => recordOperationEvents(prisma, consent, "consent.expired", operationIds, { occurredAt: now }));
  }
  return count;
}

async function accountsWithWork(): Promise<AccountRef[]> {
  const select = { providerAccountId: true, organizationId: true, applicationId: true } as const;
  const [released, requests] = await Promise.all([
    prisma.externalTransportOperation.findMany({ where: { status: QUEUED_STATUS }, distinct: ["providerAccountId"], select, take: MAX_ACCOUNTS_PER_RUN }),
    prisma.externalRecipientConsent.findMany({ where: { status: "PENDING", requestSentAt: null }, distinct: ["providerAccountId"], select, take: MAX_ACCOUNTS_PER_RUN }),
  ]);
  const byAccount = new Map<string, AccountRef>();
  for (const account of [...released, ...requests]) byAccount.set(account.providerAccountId, account);
  return [...byAccount.values()].slice(0, MAX_ACCOUNTS_PER_RUN);
}

async function processAccount(account: AccountRef, now: Date): Promise<TickResult> {
  const target = await resolveAccountTarget(account);
  if (!target) return "skipped";

  const pacing = await readPacing(account);
  const leaseToken = await claimAccount(account.providerAccountId, now);
  if (!leaseToken) return "busy";

  const paced = target.provider.kind === "baileys";
  let nextSendAt: Date | null = null;
  try {
    // Pacing, the daily cap and quiet hours protect a WhatsApp Web number.
    // Meta enforces its own limits on an official account.
    if (paced && isQuietHour(now, pacing)) {
      nextSendAt = quietHoursEndAt(now, pacing);
      return "quiet";
    }
    const result = await sendNextItem(target, account.providerAccountId, pacing, paced, now);
    if (result === "sent" && paced) nextSendAt = new Date(now.getTime() + pacingDelayMs());
    return result;
  } finally {
    await prisma.externalSenderPacing.updateMany({
      where: { providerAccountId: account.providerAccountId, leaseToken },
      data: { leaseToken: null, leaseExpiresAt: null, ...(nextSendAt ? { nextSendAt } : {}) },
    });
  }
}

/**
 * Recipients who already said yes go first: they are waiting for something
 * they agreed to. New questions only take what is left of the daily budget.
 */
async function sendNextItem(
  target: { application: ExternalApplicationContext; provider: ExternalWhatsAppProvider },
  providerAccountId: string,
  pacing: SenderPacing,
  paced: boolean,
  now: Date,
): Promise<TickResult> {
  const released = await prisma.externalConsentHeldContent.findFirst({
    where: { status: "RELEASED", operation: { is: { providerAccountId, status: QUEUED_STATUS } } },
    orderBy: { releasedAt: "asc" },
    select: { id: true, operation: { select: { id: true, payloadCiphertext: true } } },
  });
  if (released) {
    // The claim inside moves the operation out of QUEUED, so it is never picked twice.
    await submitOperation(target.application, target.provider, released.operation, QUEUED_STATUS);
    await prisma.externalConsentHeldContent.updateMany({ where: { id: released.id, settledAt: null }, data: { settledAt: now } });
    return "sent";
  }

  if (paced) {
    const sentToday = await prisma.externalRecipientConsent.count({
      where: { providerAccountId, requestSentAt: { gte: localDayStart(now, pacing.timeZone) } },
    });
    if (!hasConsentRequestBudget(sentToday, pacing)) return "capped";
  }

  const request = await prisma.externalRecipientConsent.findFirst({
    where: { providerAccountId, status: "PENDING", requestSentAt: null },
    orderBy: { requestQueuedAt: "asc" },
    select: { id: true, recipientCiphertext: true, requestTextCiphertext: true, requestTtlSeconds: true, requestAttempts: true },
  });
  if (!request) return "idle";

  const outcome = await sendConsentRequest(target.application, target.provider, request, now);
  const scope = { organizationId: target.application.organizationId, applicationId: target.application.id, providerAccountId };
  if (outcome.outcome === "sent") {
    const held = await prisma.externalConsentHeldContent.findMany({ where: { consentId: request.id, status: "HELD" }, select: { operationId: true } });
    await recordEventsAfterCommit("consent.requested", () => recordOperationEvents(prisma, scope, "consent.requested", held.map((item) => item.operationId), { occurredAt: outcome.sentAt }));
  } else if (outcome.outcome === "abandoned") {
    // The question never reached the recipient: nothing was refused and nothing
    // expired, the held content simply could not be delivered.
    await recordEventsAfterCommit("message.failed", () => recordOperationEvents(prisma, scope, "message.failed", outcome.operationIds, { occurredAt: now, failureCode: outcome.rejectionCode }));
  }
  // A failed attempt still counts as a send for pacing: the session did write.
  return outcome.outcome === "skipped" ? "idle" : "sent";
}

/** The account must still be the application's active WhatsApp account. */
async function resolveAccountTarget(account: AccountRef) {
  const application = await resolveExternalApplicationByOpaqueId(account.applicationId);
  if (!application || application.organizationId !== account.organizationId) return null;
  const provider = await resolveWhatsAppProvider(application);
  if (!provider || provider.id !== account.providerAccountId) return null;
  if (provider.kind === "baileys" && !isEvolutionConfigured()) return null;
  return { application, provider };
}

async function readPacing(account: AccountRef) {
  const where = { organizationId_providerAccountId: { organizationId: account.organizationId, providerAccountId: account.providerAccountId } };
  try {
    const row = await prisma.externalSenderPacing.upsert({
      where,
      create: { organizationId: account.organizationId, providerAccountId: account.providerAccountId },
      update: {},
    });
    return effectiveSenderPacing(row);
  } catch (error) {
    // Two runs creating the row at once: the other one won, read it.
    if (!isUniqueConstraintError(error)) throw error;
    return effectiveSenderPacing(await prisma.externalSenderPacing.findUnique({ where }));
  }
}

async function claimAccount(providerAccountId: string, now: Date) {
  const leaseToken = randomUUID();
  const claimed = await prisma.externalSenderPacing.updateMany({
    where: {
      providerAccountId,
      AND: [
        { OR: [{ nextSendAt: null }, { nextSendAt: { lte: now } }] },
        { OR: [{ leaseExpiresAt: null }, { leaseExpiresAt: { lt: now } }] },
      ],
    },
    data: { leaseToken, leaseExpiresAt: new Date(now.getTime() + ACCOUNT_LEASE_MS) },
  });
  return claimed.count === 1 ? leaseToken : null;
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
