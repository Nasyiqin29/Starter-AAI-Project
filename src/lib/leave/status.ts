// The seven statuses, the flow design §10 transition table, and the exact
// Reference E message strings — the only source for "may this move happen"
// (server actions) and for which buttons the UI may render.

export const STATUSES = [
  "Pending supervisor",
  "Signed",
  "Pending HR",
  "Approved",
  "Rejected by supervisor",
  "Rejected by HR",
  "Cancelled",
] as const;

export type LeaveStatus = (typeof STATUSES)[number];

export function isLeaveStatus(value: unknown): value is LeaveStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

export const HALF_DAY_OPTIONS = ["Morning", "Afternoon"] as const;
export type HalfDay = (typeof HALF_DAY_OPTIONS)[number];

// Reference C names the flow's rules key on (the balance cap, rule 10).
// Lives here because "use server" files may only export async functions.
export const ANNUAL_TYPE_NAME = "Annual leave";

export function isHalfDayValue(value: unknown): value is HalfDay {
  return typeof value === "string" && (HALF_DAY_OPTIONS as readonly string[]).includes(value);
}

// Flow design §10. The employee's "edit" is a same-state move (Pending
// supervisor -> Pending supervisor) so the table alone answers "may this
// action run"; resubmit is Rejected * -> Pending supervisor.
export const TRANSITIONS: Record<LeaveStatus, readonly LeaveStatus[]> = {
  "Pending supervisor": ["Signed", "Rejected by supervisor", "Cancelled", "Pending supervisor"],
  "Signed": ["Pending HR", "Cancelled"],
  "Pending HR": ["Approved", "Rejected by HR", "Cancelled"],
  "Approved": ["Cancelled"],
  "Rejected by supervisor": ["Pending supervisor"],
  "Rejected by HR": ["Pending supervisor"],
  "Cancelled": [],
};

export function canMove(from: unknown, to: LeaveStatus): boolean {
  return isLeaveStatus(from) && TRANSITIONS[from].includes(to);
}

// The exact words the acceptance checklist tests against (flow design
// Reference E).
export const LEAVE_MESSAGES = {
  done: {
    submitted: "Request submitted",
    signed: "Request signed",
    sentToHr: "Request sent to HR",
    approved: "Request approved",
    rejected: "Request rejected",
    cancelled: "Request cancelled",
    updated: "Request updated",
  },
  error: {
    supervisorDivision: "Pick a supervisor from your own division",
    dateOrder: "End date must be on or after start date",
    remarkRequired: "A remark is required when rejecting",
    otherRequired: "Say what this leave is for",
    compassionateReason: "Write a reason for compassionate leave",
    balance: "Not enough Annual leave days left",
    wrongStage: "This request can no longer be changed",
    notOwner: "You cannot act on that request",
    // Beyond Reference E: inputs the acceptance tests never send (a forged
    // or deactivated type id, a half-day on a range). Refused loudly.
    typeInvalid: "Choose one of the leave types",
    halfDayRange: "A half-day must be a single day",
  },
} as const;

export type DoneKey = keyof typeof LEAVE_MESSAGES.done;
export type ErrorKey = keyof typeof LEAVE_MESSAGES.error;

export function isDoneKey(value: unknown): value is DoneKey {
  return typeof value === "string" && value in LEAVE_MESSAGES.done;
}

export function isErrorKey(value: unknown): value is ErrorKey {
  return typeof value === "string" && value in LEAVE_MESSAGES.error;
}
