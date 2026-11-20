// Working-day and half-day counting (flow rule 7): Mon-Fri only, start and
// end inclusive; a half-day counts 0.5 and is only ever legal when start =
// end — that shape is enforced by src/lib/leave/validate.ts before a count
// is ever trusted. Pure functions, testable by hand.

import type { HalfDay } from "./status";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function countLeaveDays(
  start: Date,
  end: Date,
  halfDay: HalfDay | null,
): number {
  const s = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const e = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  if (e < s) return 0;

  if (halfDay) return 0.5; // validated single day

  let days = 0;
  for (let t = s; t <= e; t += MS_PER_DAY) {
    const weekday = new Date(t).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
  }
  return days;
}

// Shared display for dates and the days count (tables and the admin list).
export function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10); // stored at UTC midnight -> yyyy-mm-dd
}

export function formatDateRange(start: Date, end: Date): string {
  const s = formatDay(start);
  const e = formatDay(end);
  return s === e ? s : `${s} to ${e}`;
}

export function formatDays(count: number): string {
  return count === 1 ? "1 day" : `${count} days`;
}
