import type { VerificationRecord, VerificationSendTx, VerificationStore } from "./types";

/**
 * In-memory store for the tests: same contract as the Prisma store, including
 * the serialized send lock and the conditional attempt write.
 */
export function createMemoryStore() {
  const rows: VerificationRecord[] = [];
  let sequence = 0;
  let queue: Promise<unknown> = Promise.resolve();

  const tx: VerificationSendTx = {
    async sendsForPhone(organizationId, phoneNumber, since) {
      return rows.filter((row) => row.organizationId === organizationId && row.phoneNumber === phoneNumber && row.createdAt > since).map((row) => row.createdAt);
    },
    async sendsForKey(apiKeyId, since) {
      return rows.filter((row) => row.apiKeyId === apiKeyId && row.createdAt > since).map((row) => row.createdAt);
    },
    async cancelPending(organizationId, phoneNumber, at) {
      for (const row of rows) {
        if (row.organizationId === organizationId && row.phoneNumber === phoneNumber && row.status === "PENDING") {
          row.status = "CANCELED";
          row.canceledAt = at;
        }
      }
    },
    async create(data) {
      sequence += 1;
      const row: VerificationRecord = {
        ...data,
        id: `ver_${sequence}`,
        status: "PENDING",
        attempts: 0,
        approvedAt: null,
        canceledAt: null,
        failedAt: null,
        provider: null,
        errorMessage: null,
      };
      rows.push(row);
      return { ...row };
    },
  };

  function byId(id: string) {
    const row = rows.find((item) => item.id === id);
    if (!row) throw new Error(`unknown verification ${id}`);
    return row;
  }

  const store: VerificationStore = {
    withSendLock(_scope, fn) {
      const run = queue.then(() => fn(tx));
      queue = run.catch(() => undefined);
      return run;
    },
    async find(organizationId, id) {
      const row = rows.find((item) => item.id === id && item.organizationId === organizationId);
      return row ? { ...row } : null;
    },
    async markSent(id, sent) {
      const row = byId(id);
      row.provider = sent.provider;
      return { ...row };
    },
    async markFailed(id, failure) {
      const row = byId(id);
      Object.assign(row, { status: "FAILED", provider: failure.provider, errorMessage: failure.errorMessage, failedAt: failure.failedAt });
      return { ...row };
    },
    async expire(id) {
      const row = byId(id);
      if (row.status === "PENDING") row.status = "EXPIRED";
    },
    async recordAttempt(update) {
      const row = byId(update.id);
      if (row.status !== "PENDING" || row.attempts !== update.expectedAttempts || row.expiresAt <= update.now) return false;
      row.attempts = update.attempts;
      row.status = update.status;
      if (update.status === "APPROVED") row.approvedAt = update.now;
      return true;
    },
  };

  return { store, rows };
}
