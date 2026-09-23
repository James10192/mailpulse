import type { SendLimitDecision, VerificationStatus } from "./policy";
import type { VerificationLocale } from "./message";

export type VerificationRecord = {
  id: string;
  organizationId: string;
  apiKeyId: string | null;
  phoneNumber: string;
  locale: string;
  reference: string | null;
  codeHash: string;
  status: VerificationStatus;
  attempts: number;
  expiresAt: Date;
  approvedAt: Date | null;
  canceledAt: Date | null;
  failedAt: Date | null;
  provider: string | null;
  errorMessage: string | null;
  createdAt: Date;
};

export type NewVerification = {
  organizationId: string;
  apiKeyId: string;
  phoneNumber: string;
  locale: VerificationLocale;
  reference: string | null;
  codeHash: string;
  expiresAt: Date;
  createdAt: Date;
};

/** Writes made while the send lock of a number and a key is held. */
export interface VerificationSendTx {
  sendsForPhone(organizationId: string, phoneNumber: string, since: Date): Promise<Date[]>;
  sendsForKey(apiKeyId: string, since: Date): Promise<Date[]>;
  cancelPending(organizationId: string, phoneNumber: string, at: Date): Promise<void>;
  create(data: NewVerification): Promise<VerificationRecord>;
}

export type AttemptUpdate = {
  id: string;
  expectedAttempts: number;
  now: Date;
  attempts: number;
  status: VerificationStatus;
};

export interface VerificationStore {
  /** Serializes sends for one number and one key, so two requests cannot both pass a limit. */
  withSendLock<T>(scope: { organizationId: string; phoneNumber: string; apiKeyId: string }, fn: (tx: VerificationSendTx) => Promise<T>): Promise<T>;
  find(organizationId: string, id: string): Promise<VerificationRecord | null>;
  markSent(id: string, sent: { provider: string; providerMessageId: string | null }): Promise<VerificationRecord>;
  markFailed(id: string, failure: { provider: string | null; errorMessage: string; failedAt: Date }): Promise<VerificationRecord>;
  /** Records the expiry of a still-pending code; a no-op if anything changed it meanwhile. */
  expire(id: string): Promise<void>;
  /**
   * Applies one attempt only if the row is still pending, unexpired and at the
   * attempt count that was read. False means a concurrent check won the race.
   */
  recordAttempt(update: AttemptUpdate): Promise<boolean>;
}

export type TransportOutcome =
  | { ok: true; provider: string; providerMessageId: string | null }
  | { ok: false; provider: string | null; error: string };

/** The organization's WhatsApp transport, already resolved and known to be usable. */
export interface VerificationTransport {
  send(to: string, text: string): Promise<TransportOutcome>;
}

/** The pure rules, injected so tests run the real ones without a module loader. */
export type VerificationRules = {
  ttlMs: number;
  maxAttempts: number;
  lookbackMs: number;
  generateCode(): string;
  hashCode(code: string): string;
  codeMatches(code: string, hash: string): boolean;
  evaluateSendLimits(input: { now: Date; phoneSends: readonly Date[]; keySends: readonly Date[] }): SendLimitDecision;
  effectiveStatus(verification: { status: VerificationStatus; expiresAt: Date }, now: Date): VerificationStatus;
  buildMessage(locale: VerificationLocale, code: string): string;
};

export type VerificationDeps = {
  store: VerificationStore;
  rules: VerificationRules;
  now(): Date;
};
