/** Prisma error helpers that narrow `unknown` without casting. */

export function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

/** P2002: a unique constraint rejected the write. */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return hasPrismaErrorCode(error, "P2002");
}

/** P2034: a serializable transaction lost a write conflict or a deadlock. */
export function isSerializationFailure(error: unknown): boolean {
  return hasPrismaErrorCode(error, "P2034");
}

/** Upper bound of the first wait before a replay; it doubles at each attempt. */
export const SERIALIZATION_RETRY_BASE_MS = 20;

/**
 * Wait before replay number `attempt` (1, 2, …): a random delay up to a bound
 * that doubles each time. Transactions that conflicted together would collide
 * again if they all replayed at once; the randomness spreads them out.
 */
export function serializationRetryDelay(attempt: number, random = Math.random): number {
  return Math.floor(random() * SERIALIZATION_RETRY_BASE_MS * 2 ** (attempt - 1));
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Runs `run` again, up to `retries` times, when a serializable transaction
 * conflicts, waiting a short random delay before each replay.
 */
export async function retryOnSerializationFailure<T>(
  run: () => Promise<T>,
  retries = 2,
  wait: (ms: number) => Promise<void> = pause,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= retries || !isSerializationFailure(error)) throw error;
      await wait(serializationRetryDelay(attempt + 1));
    }
  }
}
