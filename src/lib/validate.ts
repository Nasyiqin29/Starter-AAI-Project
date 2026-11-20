// Input validation helpers (design rule 10: never trust the browser).
// The login form posts email + password; the server re-checks everything.

// A work email is a well-formed address whose domain is exactly budiman.com
// (HRMS doc 7.2). Used before any database touch (rule 1).
const WORK_EMAIL = /^[A-Za-z0-9._%+-]+@budiman\.com$/;

// Identity card number: two digits, hyphen, six digits (HRMS doc 7.2).
const IC_NUMBER = /^\d{2}-\d{6}$/;

export function isWorkEmail(raw: string): boolean {
  return WORK_EMAIL.test(raw.trim());
}

export function isIcNumber(raw: string): boolean {
  return IC_NUMBER.test(raw.trim());
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase(); // stored and looked up lower-cased
}
