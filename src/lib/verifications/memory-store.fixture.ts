import type { PhoneVerification } from "@/generated/prisma";
import type { ClosingStatus, VerificationSendTx, VerificationStore } from "./store";

/**
 * In-memory store for the tests, honouring the same contract as the Prisma
 * store: a try-lock per organization and single-step conditional writes (no
 * await between the condition and the write, as a SQL UPDATE … WHERE).
 */
export function createMemoryStore() {
  const rows: PhoneVerification[] = [];
  const whatsAppMessages: Array<{ organizationId: string; createdAt: Date }> = [];
  let sequence = 0;
  const heldLocks = new Set<string>();

  const tx: VerificationSendTx = {
    async recentSends(organizationId, since) {
      return rows
        .filter((row) => row.organizationId === organizationId && row.createdAt >= since)
        .map(({ createdAt, phoneNumber, apiKeyId }) => ({ createdAt, phoneNumber, apiKeyId }));
    },
    async whatsAppMessageTimes(organizationId, since) {
      return whatsAppMessages.filter((item) => item.organizationId === organizationId && item.createdAt >= since).map((item) => item.createdAt);
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
    async withOrganizationLock(organizationId, fn) {
      if (heldLocks.has(organizationId)) return { acquired: false };
      heldLocks.add(organizationId);
      try {
        return { acquired: true, value: await fn(tx) };
      } finally {
        heldLocks.delete(organizationId);
      }
    },
    async find(organizationId, id) {
      const row = rows.find((item) => item.id === id && item.organizationId === organizationId);
      return row ? { ...row } : null;
    },
    async markSent(id, sent) {
      return { ...Object.assign(byId(id), sent) };
    },
    async markFailed(id, failure) {
      const row = byId(id);
      if (row.status === "PENDING") Object.assign(row, failure, { status: "FAILED" });
      return { ...row };
    },
    async markUnconfirmed(id, unconfirmed) {
      const row = byId(id);
      if (row.status === "PENDING") Object.assign(row, unconfirmed);
      return { ...row };
    },
    async consumeAttempt({ organizationId, id, now, maxAttempts }) {
      const row = rows.find((item) => item.id === id && item.organizationId === organizationId);
      if (!row || row.status !== "PENDING" || row.attempts >= maxAttempts || row.expiresAt <= now) return null;
      row.attempts += 1;
      return { ...row };
    },
    async approveSpentAttempt(id, now) {
      const row = byId(id);
      if (row.approvedAt !== null || !["PENDING", "MAX_ATTEMPTS", "EXPIRED"].includes(row.status)) return false;
      Object.assign(row, { status: "APPROVED", approvedAt: now });
      return true;
    },
    async close(id, status: ClosingStatus) {
      const row = byId(id);
      if (row.status !== "PENDING") return false;
      row.status = status;
      return true;
    },
  };

  return { store, rows, whatsAppMessages };
}
