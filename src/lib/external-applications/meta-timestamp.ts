export const MAX_META_TIMESTAMP_FUTURE_SKEW_MS = 5 * 60 * 1_000;

export function parseMetaMessageTimestamp(value: unknown, now = new Date()) {
  if (typeof value !== "string" || !/^\d{10}(?:\d{3})?$/.test(value)) return null;
  const milliseconds = value.length === 10 ? Number(value) * 1_000 : Number(value);
  if (!Number.isSafeInteger(milliseconds)) return null;
  const occurredAt = new Date(milliseconds);
  const earliestMetaTimestamp = Date.UTC(2000, 0, 1);
  const latestMetaTimestamp = now.getTime() + MAX_META_TIMESTAMP_FUTURE_SKEW_MS;
  return occurredAt.getTime() >= earliestMetaTimestamp && occurredAt.getTime() <= latestMetaTimestamp ? occurredAt : null;
}
