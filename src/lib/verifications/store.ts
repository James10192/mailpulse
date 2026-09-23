import type { PhoneVerification, PhoneVerificationError, Prisma, PrismaClient } from "@/generated/prisma";
import type { RecentSend } from "./policy";

/**
 * Persistence of verifications. Built from a client rather than importing the
 * app singleton, so the atomicity tests can run it against a test database.
 */

export type NewVerification = Pick<
  PhoneVerification,
  "organizationId" | "apiKeyId" | "phoneNumber" | "locale" | "reference" | "codeHash" | "expiresAt" | "createdAt"
>;

/** Reads and writes made while the organization's send lock is held. */
export interface VerificationSendTx {
  recentSends(organizationId: string, since: Date): Promise<RecentSend[]>;
  whatsAppMessageTimes(organizationId: string, since: Date): Promise<Date[]>;
  cancelPending(organizationId: string, phoneNumber: string, at: Date): Promise<void>;
  create(data: NewVerification): Promise<PhoneVerification>;
}

export type LockResult<T> = { acquired: true; value: T } | { acquired: false };

/** States a still-open verification can be closed into by a check or a read. */
export type ClosingStatus = "APPROVED" | "MAX_ATTEMPTS" | "EXPIRED";

export interface VerificationStore {
  /**
   * Runs `fn` holding the organization's send lock, without waiting for it:
   * a request that finds it taken is told so and answered with a retry.
   */
  withOrganizationLock<T>(organizationId: string, fn: (tx: VerificationSendTx) => Promise<T>): Promise<LockResult<T>>;
  find(organizationId: string, id: string): Promise<PhoneVerification | null>;
  markSent(id: string, sent: { provider: string; providerMessageId: string | null }): Promise<PhoneVerification>;
  /** Records a failed send only while the verification is still pending, then returns its current state. */
  markFailed(id: string, failure: { provider: string; errorCode: PhoneVerificationError; failedAt: Date }): Promise<PhoneVerification | null>;
  /**
   * Spends one attempt, atomically, only while the code is pending, unexpired
   * and under the attempt cap. Null when nothing was spent.
   */
  consumeAttempt(input: { organizationId: string; id: string; now: Date; maxAttempts: number }): Promise<PhoneVerification | null>;
  /**
   * Closes a verification. Approval also wins over a lock or an expiry recorded
   * after the right attempt was spent, but never over a previous approval, a
   * newer code or a failed send. False when nothing changed.
   */
  settle(id: string, status: ClosingStatus, now: Date): Promise<boolean>;
}

const LOCK_NAMESPACE = "phone_verification:org:";

function sendTx(tx: Prisma.TransactionClient): VerificationSendTx {
  return {
    recentSends(organizationId, since) {
      return tx.phoneVerification.findMany({
        where: { organizationId, createdAt: { gte: since } },
        select: { createdAt: true, phoneNumber: true, apiKeyId: true },
      });
    },
    async whatsAppMessageTimes(organizationId, since) {
      const rows = await tx.communicationMessage.findMany({
        where: { organizationId, channel: "WHATSAPP", origin: "API", createdAt: { gte: since } },
        select: { createdAt: true },
      });
      return rows.map((row) => row.createdAt);
    },
    async cancelPending(organizationId, phoneNumber, at) {
      await tx.phoneVerification.updateMany({
        where: { organizationId, phoneNumber, status: "PENDING" },
        data: { status: "CANCELED", canceledAt: at },
      });
    },
    create(data) {
      return tx.phoneVerification.create({ data });
    },
  };
}

function settleWhere(id: string, status: ClosingStatus): Prisma.PhoneVerificationWhereInput {
  if (status === "APPROVED") return { id, approvedAt: null, status: { in: ["PENDING", "MAX_ATTEMPTS", "EXPIRED"] } };
  return { id, status: "PENDING" };
}

export function createPrismaVerificationStore(client: PrismaClient): VerificationStore {
  return {
    async withOrganizationLock(organizationId, fn) {
      return client.$transaction(async (tx) => {
        // Transaction-scoped: released on commit or rollback, a crash never
        // leaves an organization locked.
        const [row] = await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_xact_lock(hashtextextended(${LOCK_NAMESPACE + organizationId}, 0)) AS locked`;
        if (!row?.locked) return { acquired: false } as const;
        return { acquired: true, value: await fn(sendTx(tx)) } as const;
      });
    },
    find(organizationId, id) {
      return client.phoneVerification.findFirst({ where: { id, organizationId } });
    },
    markSent(id, sent) {
      return client.phoneVerification.update({ where: { id }, data: sent });
    },
    async markFailed(id, failure) {
      await client.phoneVerification.updateMany({ where: { id, status: "PENDING" }, data: { ...failure, status: "FAILED" } });
      return client.phoneVerification.findUnique({ where: { id } });
    },
    async consumeAttempt({ organizationId, id, now, maxAttempts }) {
      const [row] = await client.phoneVerification.updateManyAndReturn({
        where: { id, organizationId, status: "PENDING", attempts: { lt: maxAttempts }, expiresAt: { gt: now } },
        data: { attempts: { increment: 1 } },
      });
      return row ?? null;
    },
    async settle(id, status, now) {
      const result = await client.phoneVerification.updateMany({
        where: settleWhere(id, status),
        data: { status, ...(status === "APPROVED" ? { approvedAt: now } : {}) },
      });
      return result.count === 1;
    },
  };
}
