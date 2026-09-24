/** Width in percent of an image node, 100 when unset. */
export function readWidth(width: unknown): number {
  const parsed = Number.parseInt(String(width ?? "").replace(/%|px/g, ""), 10);
  return Number.isFinite(parsed) ? parsed : 100;
}
