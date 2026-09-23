import type { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import type { VerificationSendTx, VerificationStore } from "./types";

const LOCK_NAMESPACE = "phone_verification";

function sendTx(tx: Prisma.TransactionClient): VerificationSendTx {
  return {
    async sendsForPhone(organizationId, phoneNumber, since) {
      const rows = await tx.phoneVerification.findMany({
        where: { organizationId, phoneNumber, createdAt: { gt: since } },
        select: { createdAt: true },
      });
      return rows.map((row) => row.createdAt);
    },
    async sendsForKey(apiKeyId, since) {
      const rows = await tx.phoneVerification.findMany({
        where: { apiKeyId, createdAt: { gt: since } },
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

/**
 * Transaction-scoped advisory locks: released on commit or rollback, so a crash
 * can never leave a number locked. Always taken key first, then number, so two
 * requests can never wait on each other in opposite order.
 */
async function lock(tx: Prisma.TransactionClient, value: string) {
  // $executeRaw, not $queryRaw: the function returns `void`, a column type the
  // query path cannot deserialize.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${LOCK_NAMESPACE}:${value}`}, 0))`;
}

export const prismaVerificationStore: VerificationStore = {
  withSendLock(scope, fn) {
    return prisma.$transaction(async (tx) => {
      await lock(tx, `key:${scope.apiKeyId}`);
      await lock(tx, `phone:${scope.organizationId}:${scope.phoneNumber}`);
      return fn(sendTx(tx));
    });
  },
  find(organizationId, id) {
    return prisma.phoneVerification.findFirst({ where: { id, organizationId } });
  },
  markSent(id, sent) {
    return prisma.phoneVerification.update({ where: { id }, data: sent });
  },
  markFailed(id, failure) {
    return prisma.phoneVerification.update({ where: { id }, data: { ...failure, status: "FAILED" } });
  },
  async expire(id) {
    await prisma.phoneVerification.updateMany({ where: { id, status: "PENDING" }, data: { status: "EXPIRED" } });
  },
  async recordAttempt(update) {
    const result = await prisma.phoneVerification.updateMany({
      where: { id: update.id, status: "PENDING", attempts: update.expectedAttempts, expiresAt: { gt: update.now } },
      data: {
        attempts: update.attempts,
        status: update.status,
        ...(update.status === "APPROVED" ? { approvedAt: update.now } : {}),
      },
    });
    return result.count === 1;
  },
};
