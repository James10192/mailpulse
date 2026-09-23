import type { PhoneVerification, Prisma, PrismaClient } from "@/generated/prisma";
import type { RecentSend } from "./policy";

/**
 * Persistence of verifications. Built from a client rather than importing the
 * app singleton, so the atomicity tests can run it against a dedicated database.
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

export interface VerificationStore {
  /** Serializes the sends of one organization, so two requests cannot both pass a limit. */
  withOrganizationLock<T>(organizationId: string, fn: (tx: VerificationSendTx) => Promise<T>): Promise<T>;
  find(organizationId: string, id: string): Promise<PhoneVerification | null>;
  markSent(id: string, sent: { provider: string; providerMessageId: string | null }): Promise<PhoneVerification>;
  markFailed(id: string, failure: { provider: string; errorCode: string; failedAt: Date }): Promise<PhoneVerification>;
  expire(id: string): Promise<void>;
  /**
   * Spends one attempt, atomically, only while the code is pending, unexpired
   * and under the attempt cap. Null when nothing was spent.
   */
  consumeAttempt(input: { organizationId: string; id: string; now: Date; maxAttempts: number }): Promise<PhoneVerification | null>;
  /** Moves a still-pending verification to a final state. False if something else settled it first. */
  settle(id: string, status: "APPROVED" | "MAX_ATTEMPTS", now: Date): Promise<boolean>;
}

const LOCK_NAMESPACE = "phone_verification:org:";

function sendTx(tx: Prisma.TransactionClient): VerificationSendTx {
  return {
    recentSends(organizationId, since) {
      return tx.phoneVerification.findMany({
        where: { organizationId, createdAt: { gt: since } },
        select: { createdAt: true, phoneNumber: true, apiKeyId: true },
      });
    },
    async whatsAppMessageTimes(organizationId, since) {
      const rows = await tx.communicationMessage.findMany({
        where: { organizationId, channel: "WHATSAPP", origin: "API", createdAt: { gt: since } },
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

export function createPrismaVerificationStore(client: PrismaClient): VerificationStore {
  return {
    withOrganizationLock(organizationId, fn) {
      return client.$transaction(async (tx) => {
        // Transaction-scoped: released on commit or rollback, a crash never
        // leaves an organization locked. $executeRaw because the function
        // returns `void`, a type the query path cannot deserialize.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${LOCK_NAMESPACE + organizationId}, 0))`;
        return fn(sendTx(tx));
      });
    },
    find(organizationId, id) {
      return client.phoneVerification.findFirst({ where: { id, organizationId } });
    },
    markSent(id, sent) {
      return client.phoneVerification.update({ where: { id }, data: sent });
    },
    markFailed(id, failure) {
      return client.phoneVerification.update({ where: { id }, data: { ...failure, status: "FAILED" } });
    },
    async expire(id) {
      await client.phoneVerification.updateMany({ where: { id, status: "PENDING" }, data: { status: "EXPIRED" } });
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
        where: { id, status: "PENDING" },
        data: { status, ...(status === "APPROVED" ? { approvedAt: now } : {}) },
      });
      return result.count === 1;
    },
  };
}
