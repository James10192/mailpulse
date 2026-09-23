import type { PhoneVerification } from "@/generated/prisma";
import type { VerificationSendTx, VerificationStore } from "./store";

/**
 * In-memory store for the tests, honouring the same contract as the Prisma
 * store: a serialized organization lock and single-step conditional writes
 * (no await between the condition and the write, as a SQL UPDATE … WHERE).
 */
export function createMemoryStore() {
  const rows: PhoneVerification[] = [];
  const whatsAppMessages: Array<{ organizationId: string; createdAt: Date }> = [];
  let sequence = 0;
  let queue: Promise<unknown> = Promise.resolve();

  const tx: VerificationSendTx = {
    async recentSends(organizationId, since) {
      return rows
        .filter((row) => row.organizationId === organizationId && row.createdAt > since)
        .map(({ createdAt, phoneNumber, apiKeyId }) => ({ createdAt, phoneNumber, apiKeyId }));
    },
    async whatsAppMessageTimes(organizationId, since) {
      return whatsAppMessages.filter((item) => item.organizationId === organizationId && item.createdAt > since).map((item) => item.createdAt);
    },
    async cancelPending(organizationId, phoneNumber, at) {
      for (const row of rows) {
        if (row.organizationId === organizationId && row.phoneNumber === phoneNumber && row.status === "PENDING") {
          Object.assign(row, { status: "CANCELED", canceledAt: at });
        }
      }
    },
    async create(data) {
      sequence += 1;
      const row: PhoneVerification = {
        ...data,
        id: `ver_${sequence}`,
        channel: "WHATSAPP",
        status: "PENDING",
        attempts: 0,
        approvedAt: null,
        canceledAt: null,
        failedAt: null,
        provider: null,
        providerMessageId: null,
        errorCode: null,
        updatedAt: data.createdAt,
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
    withOrganizationLock(_organizationId, fn) {
      const run = queue.then(() => fn(tx));
      queue = run.catch(() => undefined);
      return run;
    },
    async find(organizationId, id) {
      const row = rows.find((item) => item.id === id && item.organizationId === organizationId);
      return row ? { ...row } : null;
    },
    async markSent(id, sent) {
      return { ...Object.assign(byId(id), sent) };
    },
    async markFailed(id, failure) {
      return { ...Object.assign(byId(id), failure, { status: "FAILED" }) };
    },
    async expire(id) {
      const row = byId(id);
      if (row.status === "PENDING") row.status = "EXPIRED";
    },
    async consumeAttempt({ organizationId, id, now, maxAttempts }) {
      const row = rows.find((item) => item.id === id && item.organizationId === organizationId);
      if (!row || row.status !== "PENDING" || row.attempts >= maxAttempts || row.expiresAt <= now) return null;
      row.attempts += 1;
      return { ...row };
    },
    async settle(id, status, now) {
      const row = byId(id);
      if (row.status !== "PENDING") return false;
      row.status = status;
      if (status === "APPROVED") row.approvedAt = now;
      return true;
    },
  };

  return { store, rows, whatsAppMessages };
}
