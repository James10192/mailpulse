// Narrow `unknown` values (JSON metadata, editor attributes) without casting.

/** A plain object whose keys can be read, such as JSON metadata. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A non-empty string, or null. */
export function readString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}
