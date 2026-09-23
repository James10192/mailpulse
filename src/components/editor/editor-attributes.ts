// Node and mark attributes come back from Tiptap as `unknown`-ish values: read them
// through these guards instead of casting.

/** A non-empty string attribute, or null. */
export function readString(value: unknown): string | null {
  return typeof value === "string" && value !== "" ? value : null;
}

/** Width in percent of an image node, 100 when unset. */
export function readWidth(width: unknown): number {
  const parsed = Number.parseInt(String(width ?? "").replace(/%|px/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 100;
}
