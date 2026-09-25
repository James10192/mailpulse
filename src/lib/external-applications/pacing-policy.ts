/**
 * When a sending account may write next. A WhatsApp Web session that writes to
 * many strangers in a burst, or at night, is what gets a number banned, so the
 * Baileys rail spaces its sends, caps its first contacts and sleeps at night.
 * Kept dependency-free so the rules are directly testable.
 */

export type SenderPacing = {
  dailyConsentRequestLimit: number;
  /** Local hour, 0 to 23, at which sending stops. */
  quietHoursStart: number;
  /** Local hour, 0 to 23, at which sending resumes. */
  quietHoursEnd: number;
  timeZone: string;
};

export const DEFAULT_SENDER_PACING: SenderPacing = {
  dailyConsentRequestLimit: 40,
  quietHoursStart: 21,
  quietHoursEnd: 7,
  timeZone: "Africa/Abidjan",
};

export const MIN_PACING_DELAY_MS = 15_000;
export const MAX_PACING_DELAY_MS = 45_000;

/** A random pause of 15 to 45 s between two messages from the same account. */
export function pacingDelayMs(random: () => number = Math.random) {
  const unit = Math.min(Math.max(random(), 0), 1);
  return Math.round(MIN_PACING_DELAY_MS + unit * (MAX_PACING_DELAY_MS - MIN_PACING_DELAY_MS));
}

type LocalClock = { hour: number; minute: number; second: number; millisecond: number };

export function localClock(now: Date, timeZone: string): LocalClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { hour: read("hour") % 24, minute: read("minute"), second: read("second"), millisecond: now.getUTCMilliseconds() };
}

/** Handles a window crossing midnight (21 h to 7 h) as well as one within a day. Equal bounds mean no quiet hours. */
export function isQuietHour(now: Date, pacing: Pick<SenderPacing, "quietHoursStart" | "quietHoursEnd" | "timeZone">) {
  const { quietHoursStart: start, quietHoursEnd: end } = pacing;
  if (start === end) return false;
  const { hour } = localClock(now, pacing.timeZone);
  return start > end ? hour >= start || hour < end : hour >= start && hour < end;
}

/**
 * The next local `quietHoursEnd` o'clock. A daylight-saving shift inside the gap
 * can move it by an hour; the next run checks the quiet hours again anyway.
 */
export function quietHoursEndAt(now: Date, pacing: Pick<SenderPacing, "quietHoursEnd" | "timeZone">) {
  const clock = localClock(now, pacing.timeZone);
  const hoursUntil = (pacing.quietHoursEnd - clock.hour + 24) % 24 || 24;
  const elapsedInHourMs = (clock.minute * 60 + clock.second) * 1000 + clock.millisecond;
  return new Date(now.getTime() + hoursUntil * 3_600_000 - elapsedInHourMs);
}

/** Local midnight of the current day in the account's time zone. */
export function localDayStart(now: Date, timeZone: string) {
  const clock = localClock(now, timeZone);
  const elapsedMs = ((clock.hour * 60 + clock.minute) * 60 + clock.second) * 1000 + clock.millisecond;
  return new Date(now.getTime() - elapsedMs);
}

export function hasConsentRequestBudget(sentToday: number, pacing: Pick<SenderPacing, "dailyConsentRequestLimit">) {
  return sentToday < pacing.dailyConsentRequestLimit;
}

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** A stored configuration that no longer parses falls back to the defaults rather than stopping the queue. */
export function effectiveSenderPacing(stored: Partial<SenderPacing> | null | undefined): SenderPacing {
  const hour = (value: number | undefined, fallback: number) => Number.isInteger(value) && value! >= 0 && value! <= 23 ? value! : fallback;
  return {
    dailyConsentRequestLimit: Number.isInteger(stored?.dailyConsentRequestLimit) && stored!.dailyConsentRequestLimit! >= 0
      ? stored!.dailyConsentRequestLimit!
      : DEFAULT_SENDER_PACING.dailyConsentRequestLimit,
    quietHoursStart: hour(stored?.quietHoursStart, DEFAULT_SENDER_PACING.quietHoursStart),
    quietHoursEnd: hour(stored?.quietHoursEnd, DEFAULT_SENDER_PACING.quietHoursEnd),
    timeZone: stored?.timeZone && isValidTimeZone(stored.timeZone) ? stored.timeZone : DEFAULT_SENDER_PACING.timeZone,
  };
}
