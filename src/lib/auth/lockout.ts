// In-memory fail counter and 15-minute lock (design rule 3, AC-04).
// Per email: consecutive fails + unlock time. A dev-server restart
// clears it by design. The counter keys on the normalised email; the
// caller only records failures for well-formed work emails.

const MAX_CONSECUTIVE_FAILURES = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

type Attempt = { fails: number; lockedUntil: number | null };

const attempts = new Map<string, Attempt>();

export function isLockedOut(email: string): boolean {
  const attempt = attempts.get(email);
  if (!attempt?.lockedUntil) return false;
  return Date.now() < attempt.lockedUntil;
}

export function registerFailure(email: string): void {
  const attempt = attempts.get(email) ?? { fails: 0, lockedUntil: null };
  if (attempt.lockedUntil !== null && Date.now() >= attempt.lockedUntil) {
    // The lock has expired: start counting fresh.
    attempt.fails = 0;
    attempt.lockedUntil = null;
  }
  attempt.fails += 1;
  if (attempt.fails >= MAX_CONSECUTIVE_FAILURES) {
    attempt.lockedUntil = Date.now() + LOCK_DURATION_MS;
  }
  attempts.set(email, attempt);
}

// A successful login resets the counter (AC-04 last bullet).
export function registerSuccess(email: string): void {
  attempts.delete(email);
}
