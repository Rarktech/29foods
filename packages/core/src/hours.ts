/** Kitchen hours, West Africa Time (UTC+1, no DST). */
export const KITCHEN_OPEN_HOUR = 10;
export const KITCHEN_CLOSE_HOUR = 21;

/** Hour of day in WAT — same UTC+1 shift as spin.ts's watDateString. */
export function watHour(now: Date = new Date()): number {
  return new Date(now.getTime() + 60 * 60 * 1000).getUTCHours();
}

export function isKitchenOpen(now: Date = new Date()): boolean {
  const hour = watHour(now);
  return hour >= KITCHEN_OPEN_HOUR && hour < KITCHEN_CLOSE_HOUR;
}

export type TimeOfDay = "morning" | "lunch" | "evening" | "late";

/** Shifts the opening framing only — the menu itself never changes by time of day. */
export function timeOfDay(now: Date = new Date()): TimeOfDay {
  const hour = watHour(now);
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 21) return "evening";
  return "late";
}
