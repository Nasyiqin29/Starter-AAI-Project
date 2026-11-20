// Server-side validation for the leave form (flow rules 3, 7, 8, 9, 14).
// Every value arriving from the browser is re-checked here — the form's
// dropdowns are a convenience, never a security boundary.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const REASON_MAX = 500; // flow design §9

// "yyyy-mm-dd" -> Date at UTC midnight (counting is UTC-based in days.ts),
// or null when the value is missing or malformed.
export function parseDateOnly(raw: FormDataEntryValue | null): Date | null {
  if (typeof raw !== "string" || !DATE_ONLY.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Trimmed free text; empty becomes null, and the §9 limit is enforced.
export function normalizeText(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, REASON_MAX);
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}
