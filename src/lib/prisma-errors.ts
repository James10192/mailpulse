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

/** Runs `run` again, up to `retries` times, when a serializable transaction conflicts. */
export async function retryOnSerializationFailure<T>(run: () => Promise<T>, retries = 2): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= retries || !isSerializationFailure(error)) throw error;
    }
  }
}
