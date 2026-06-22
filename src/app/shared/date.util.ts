/**
 * Local-date helpers for `YYYY-MM-DD` ↔ `Date` conversion.
 *
 * `new Date('2026-07-04')` parses as **UTC** midnight, which renders as the
 * previous day in negative-offset timezones (e.g. America/Chicago). These
 * helpers stay in **local** time so a calendar-day value never shifts.
 */

/** Parse a `YYYY-MM-DD` (or ISO) string to a local `Date`, or `null`. */
export function ymdToLocalDate(ymd: string | null | undefined): Date | null {
  if (!ymd) return null;
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Format a local `Date` to `YYYY-MM-DD`, or `null`. */
export function localDateToYmd(date: Date | null | undefined): string | null {
  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
