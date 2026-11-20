"use server";

// Server actions for the leave flow (flow design §14). Each exported
// action starts with requireUser + the §13 role gate, then calls the *Core
// function with the session; the Core function re-reads the row and the
// actor from the database and enforces rule 13 ownership and the §10 stage.
// A hidden button is never the protection (flow rule 1).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROLE_HOME, ROLES } from "@/lib/auth/roles";
import { requireUser, type Session } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { notifyEmployee, notifyHrOfficers, notifyNewRequest, type NotifiedRequest } from "@/lib/notify";
import { withinAnnualBalance } from "./balance";
import { countLeaveDays, formatDateRange, formatDays } from "./days";
import { isSameDay, normalizeText, parseDateOnly } from "./validate";
import {
  canMove,
  isHalfDayValue,
  type ErrorKey,
  type HalfDay,
} from "./status";

const COMPASSIONATE_TYPE_NAME = "Compassionate leave";
const OTHER_TYPE_NAME = "Other";

export type ActionResult = { ok: true } | { ok: false; errorKey: ErrorKey };

// Shared field parsing for submit, edit and resubmit (rules 3, 7, 8, 9).
// The browser's values are re-checked here; the dropdowns are convenience
// only. Returns null on the first failure together with its error key.
type ParsedFields = {
  leaveTypeId: number;
  supervisorId: number | null;
  otherLeaveType: string | null;
  reason: string | null;
  startDate: Date;
  endDate: Date;
  halfDay: HalfDay | null;
};

async function parseLeaveFields(
  actor: { id: number; role: string; division: string },
  form: FormData,
): Promise<
  { ok: true; fields: ParsedFields; leaveTypeName: string } | { ok: false; errorKey: ErrorKey }
> {
  const leaveTypeId = Number(form.get("leaveTypeId"));
  const leaveType = Number.isInteger(leaveTypeId)
    ? await prisma.leaveType.findFirst({ where: { id: leaveTypeId, active: true } })
    : null;
  if (!leaveType) return { ok: false, errorKey: "typeInvalid" };

  // Rule 4: a Supervisor's own request has no supervisor (it lives in the
  // HR queue). An Employee's must name a Supervisor of the same division
  // (rule 3), checked against the database, not the dropdown.
  let supervisorId: number | null = null;
  if (actor.role === "Employee") {
    const rawSupervisorId = Number(form.get("supervisorId"));
    const supervisor = Number.isInteger(rawSupervisorId)
      ? await prisma.user.findFirst({
          where: { id: rawSupervisorId, role: "Supervisor", division: actor.division },
        })
      : null;
    if (!supervisor) return { ok: false, errorKey: "supervisorDivision" };
    supervisorId = supervisor.id;
  }

  const startDate = parseDateOnly(form.get("startDate"));
  const endDate = parseDateOnly(form.get("endDate"));
  if (!startDate || !endDate) return { ok: false, errorKey: "dateOrder" };
  if (endDate < startDate) return { ok: false, errorKey: "dateOrder" }; // rule 8

  const rawHalfDay = String(form.get("halfDay") ?? "");
  let halfDay: HalfDay | null = null;
  if (rawHalfDay) {
    if (!isHalfDayValue(rawHalfDay)) return { ok: false, errorKey: "halfDayRange" };
    if (!isSameDay(startDate, endDate)) return { ok: false, errorKey: "halfDayRange" }; // rule 7
    halfDay = rawHalfDay;
  }

  // Rule 9: type-conditional fields.
  const otherLeaveType = normalizeText(form.get("otherLeaveType"));
  const reason = normalizeText(form.get("reason"));
  if (leaveType.name === OTHER_TYPE_NAME && !otherLeaveType) {
    return { ok: false, errorKey: "otherRequired" };
  }
  if (leaveType.name === COMPASSIONATE_TYPE_NAME && !reason) {
    return { ok: false, errorKey: "compassionateReason" };
  }

  return {
    ok: true,
    leaveTypeName: leaveType.name,
    fields: { leaveTypeId: leaveType.id, supervisorId, otherLeaveType, reason, startDate, endDate, halfDay },
  };
}

// The rule 10 gate: one server action reads the balance and writes the row.
async function overAnnualBalance(
  actor: { id: number; annualLeaveEntitlement: number },
  parsed: { fields: ParsedFields; leaveTypeName: string },
  exceptRowId?: number,
): Promise<boolean> {
  const f = parsed.fields;
  const fits = await withinAnnualBalance(
    actor.id,
    parsed.leaveTypeName,
    actor.annualLeaveEntitlement,
    f.startDate,
    f.endDate,
    f.halfDay,
    exceptRowId,
  );
  return !fits;
}

// The row a mutating action may touch: it must exist and belong to the
// actor (rule 13); the actor must be a real Employee or Supervisor in the
// database, never just a cookie claim.
async function loadOwnedRow(
  session: Session,
  requestId: number,
): Promise<
  { ok: true; actorRole: "Employee" | "Supervisor"; row: OwnedRow } | { ok: false; errorKey: ErrorKey }
> {
  const actor = Number.isInteger(session.userId)
    ? await prisma.user.findUnique({ where: { id: session.userId } })
    : null;
  if (!actor || (actor.role !== "Employee" && actor.role !== "Supervisor")) {
    return { ok: false, errorKey: "notOwner" };
  }
  const row = Number.isInteger(requestId)
    ? await prisma.leaveRequest.findUnique({ where: { id: requestId } })
    : null;
  if (!row || row.employeeId !== actor.id) return { ok: false, errorKey: "notOwner" };
  return { ok: true, actorRole: actor.role, row };
}

type OwnedRow = {
  id: number;
  status: string;
  startDate: Date;
};

// Submit — flow rule 2: Employees submit (a Supervisor only for themselves,
// rule 4).
export async function submitLeaveRequestCore(
  session: Session,
  form: FormData,
): Promise<ActionResult> {
  const actor = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!actor || (actor.role !== "Employee" && actor.role !== "Supervisor")) {
    return { ok: false, errorKey: "notOwner" };
  }

  const parsed = await parseLeaveFields(actor, form);
  if (!parsed.ok) return parsed;

  if (await overAnnualBalance(actor, parsed)) return { ok: false, errorKey: "balance" }; // rule 10

  const status = actor.role === "Supervisor" ? "Pending HR" : "Pending supervisor";
  const created = await prisma.leaveRequest.create({
    data: { employeeId: actor.id, status, ...parsed.fields },
  });

  // Trigger 1: the chosen supervisor hears about the new request.
  await notifyBestEffort(created.id, notifyNewRequest);

  return { ok: true };
}

// Every action accepts any signed-in user; the Core function re-checks
// role, ownership and stage from the database (rule 13), and anyone refused
// returns to their own role home with the exact Reference E string — that
// is how an Admin acting through DevTools sees "You cannot act on that
// request" (AC-24).
export async function submitRequest(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await submitLeaveRequestCore(session, formData);
  revalidatePath("/employee");
  revalidatePath("/supervisor");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=submitted` : `${home}?error=${result.errorKey}`);
}

function readId(form: FormData): number {
  return Number(form.get("id"));
}

// Rule 15: build the mail summary from the database row only. Never throws:
// a mail step must not block or reverse the action that just succeeded.
async function notifyBestEffort(
  rowId: number,
  send: (r: NotifiedRequest) => Promise<void>,
): Promise<void> {
  try {
    const row = await prisma.leaveRequest.findUnique({
      where: { id: rowId },
      include: {
        employee: { select: { name: true } },
        leaveType: { select: { name: true } },
      },
    });
    if (!row) return;
    await send({
      id: row.id,
      employeeId: row.employeeId,
      employeeName: row.employee.name,
      supervisorId: row.supervisorId,
      typeName: row.leaveType.name,
      dates: formatDateRange(row.startDate, row.endDate),
      days: formatDays(
        countLeaveDays(row.startDate, row.endDate, isHalfDayValue(row.halfDay) ? row.halfDay : null),
      ),
    });
  } catch (err) {
    console.error(`[email] skipped: ${(err as Error).message}`);
  }
}

// Sign — flow §10: only the named supervisor moves Pending supervisor ->
// Signed. Rule 13: the row is re-read and the actor checked every time.
export async function signRequestCore(session: Session, requestId: number): Promise<ActionResult> {
  if (session.role !== "Supervisor") return { ok: false, errorKey: "notOwner" };
  const row = Number.isInteger(requestId)
    ? await prisma.leaveRequest.findUnique({ where: { id: requestId } })
    : null;
  if (!row || row.supervisorId !== session.userId) return { ok: false, errorKey: "notOwner" };
  if (!canMove(row.status, "Signed")) return { ok: false, errorKey: "wrongStage" };
  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: "Signed", signedAt: new Date() },
  });
  // Trigger 2: the employee hears their request was signed.
  await notifyBestEffort(row.id, (r) => notifyEmployee(r, "Request signed"));
  return { ok: true };
}

// Reject — rule 6: a supervisor rejection always carries a remark.
export async function rejectBySupervisorCore(
  session: Session,
  requestId: number,
  remark: string | null,
): Promise<ActionResult> {
  if (session.role !== "Supervisor") return { ok: false, errorKey: "notOwner" };
  const trimmed = typeof remark === "string" ? remark.trim() : "";
  if (!trimmed) return { ok: false, errorKey: "remarkRequired" };
  const row = Number.isInteger(requestId)
    ? await prisma.leaveRequest.findUnique({ where: { id: requestId } })
    : null;
  if (!row || row.supervisorId !== session.userId) return { ok: false, errorKey: "notOwner" };
  if (!canMove(row.status, "Rejected by supervisor")) return { ok: false, errorKey: "wrongStage" };
  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: "Rejected by supervisor", supervisorRemark: trimmed.slice(0, 500) },
  });
  // Trigger 2: the employee hears their request was rejected.
  await notifyBestEffort(row.id, (r) => notifyEmployee(r, "Request rejected", trimmed));
  return { ok: true };
}

export async function signRequest(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await signRequestCore(session, readId(formData));
  revalidatePath("/supervisor");
  revalidatePath("/employee");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=signed` : `${home}?error=${result.errorKey}`);
}

export async function rejectBySupervisor(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await rejectBySupervisorCore(
    session,
    readId(formData),
    String(formData.get("remark") ?? ""),
  );
  revalidatePath("/supervisor");
  revalidatePath("/employee");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=rejected` : `${home}?error=${result.errorKey}`);
}

// Send to HR — flow §10: the owner moves their own Signed row to the shared
// HR queue. Rule 13: the row must belong to the actor.
export async function sendToHrCore(session: Session, requestId: number): Promise<ActionResult> {
  const row = Number.isInteger(requestId)
    ? await prisma.leaveRequest.findUnique({ where: { id: requestId } })
    : null;
  if (!row || row.employeeId !== session.userId) return { ok: false, errorKey: "notOwner" };
  if (session.role !== "Employee" && session.role !== "Supervisor") {
    return { ok: false, errorKey: "notOwner" };
  }
  if (!canMove(row.status, "Pending HR")) return { ok: false, errorKey: "wrongStage" };
  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: "Pending HR" },
  });
  // Trigger 3: every HR officer hears about the queue addition.
  await notifyBestEffort(row.id, notifyHrOfficers);
  return { ok: true };
}

// Approve — HRMS doc 5.3 rule 5: either HR officer can decide, and the
// system records who did (hrOfficerId + decidedAt).
export async function approveRequestCore(session: Session, requestId: number): Promise<ActionResult> {
  if (session.role !== "HR") return { ok: false, errorKey: "notOwner" };
  const row = Number.isInteger(requestId)
    ? await prisma.leaveRequest.findUnique({ where: { id: requestId } })
    : null;
  if (!row) return { ok: false, errorKey: "notOwner" };
  if (!canMove(row.status, "Approved")) return { ok: false, errorKey: "wrongStage" };
  await prisma.leaveRequest.update({
    where: { id: row.id },
    data: { status: "Approved", hrOfficerId: session.userId, decidedAt: new Date() },
  });
  // Trigger 4: the employee hears the HR decision (HRMS doc 5.3 rule 5).
  await notifyBestEffort(row.id, (r) => notifyEmployee(r, "Request approved"));
  return { ok: true };
}

// HR reject — rule 6: a rejection always carries a remark.
export async function rejectByHrCore(
  session: Session,
  requestId: number,
  remark: string | null,
): Promise<ActionResult> {
  if (session.role !== "HR") return { ok: false, errorKey: "notOwner" };
  const trimmed = typeof remark === "string" ? remark.trim() : "";
  if (!trimmed) return { ok: false, errorKey: "remarkRequired" };
  const row = Number.isInteger(requestId)
    ? await prisma.leaveRequest.findUnique({ where: { id: requestId } })
    : null;
  if (!row) return { ok: false, errorKey: "notOwner" };
  if (!canMove(row.status, "Rejected by HR")) return { ok: false, errorKey: "wrongStage" };
  await prisma.leaveRequest.update({
    where: { id: row.id },
    // Rule 6: every HR decision records who made it (design §9, audit trail).
    data: {
      status: "Rejected by HR",
      hrRemark: trimmed.slice(0, 500),
      hrOfficerId: session.userId,
      decidedAt: new Date(),
    },
  });
  // Trigger 4: the employee hears the HR decision.
  await notifyBestEffort(row.id, (r) => notifyEmployee(r, "Request rejected", trimmed));
  return { ok: true };
}

// Wrapper for a Supervisor submitting their own request (flow rule 4): the
// core puts it straight into Pending HR, skipping the supervisor step.
export async function submitOwnRequest(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await submitLeaveRequestCore(session, formData);
  revalidatePath("/supervisor");
  revalidatePath("/hr");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=submitted` : `${home}?error=${result.errorKey}`);
}

export async function sendToHr(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await sendToHrCore(session, readId(formData));
  revalidatePath("/employee");
  revalidatePath("/hr");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=sentToHr` : `${home}?error=${result.errorKey}`);
}

export async function approveRequest(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await approveRequestCore(session, readId(formData));
  revalidatePath("/hr");
  revalidatePath("/employee");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=approved` : `${home}?error=${result.errorKey}`);
}

export async function rejectByHr(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await rejectByHrCore(
    session,
    readId(formData),
    String(formData.get("remark") ?? ""),
  );
  revalidatePath("/hr");
  revalidatePath("/employee");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=rejected` : `${home}?error=${result.errorKey}`);
}

// Edit — flow rule 12: only own rows in Pending supervisor; the same fields
// submit accepts (rule 12 lists type, supervisor, dates, half-day, reason).
// The status check re-runs here at click time, not just in the UI (§10).
export async function editRequestCore(session: Session, form: FormData): Promise<ActionResult> {
  const owned = await loadOwnedRow(session, Number(form.get("id")));
  if (!owned.ok) return owned;
  if (owned.row.status !== "Pending supervisor") return { ok: false, errorKey: "wrongStage" };

  const actor = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const parsed = await parseLeaveFields(actor, form);
  if (!parsed.ok) return parsed;

  if (await overAnnualBalance(actor, parsed, owned.row.id)) {
    return { ok: false, errorKey: "balance" }; // rule 10 (row excluded from "used")
  }

  await prisma.leaveRequest.update({ where: { id: owned.row.id }, data: parsed.fields });
  return { ok: true };
}

// Resubmit — rule 12: a Rejected row gets the same edit and returns to
// Pending supervisor, keeping the old remark on record (AC-21). A
// Supervisor's own rows re-enter the HR queue instead (flow rule 4: they
// have no supervisor stage).
export async function resubmitRequestCore(session: Session, form: FormData): Promise<ActionResult> {
  const owned = await loadOwnedRow(session, Number(form.get("id")));
  if (!owned.ok) return owned;
  if (!canMove(owned.row.status, "Pending supervisor") || owned.row.status === "Pending supervisor") {
    return { ok: false, errorKey: "wrongStage" };
  }

  const actor = await prisma.user.findUniqueOrThrow({ where: { id: session.userId } });
  const parsed = await parseLeaveFields(actor, form);
  if (!parsed.ok) return parsed;

  if (await overAnnualBalance(actor, parsed, owned.row.id)) {
    return { ok: false, errorKey: "balance" }; // rule 10 (row excluded from "used")
  }

  const status = owned.actorRole === "Supervisor" ? "Pending HR" : "Pending supervisor";
  await prisma.leaveRequest.update({
    where: { id: owned.row.id },
    data: { ...parsed.fields, status },
  });
  return { ok: true };
}

// Cancel / Withdraw — flow rule 11: one move to Cancelled from Pending
// supervisor, Signed and Pending HR; from Approved only while the start
// date is still in the future (that case is the employee's Withdraw).
export async function cancelRequestCore(session: Session, requestId: number): Promise<ActionResult> {
  const owned = await loadOwnedRow(session, requestId);
  if (!owned.ok) return owned;
  if (!canMove(owned.row.status, "Cancelled")) return { ok: false, errorKey: "wrongStage" };
  if (owned.row.status === "Approved") {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (owned.row.startDate.getTime() <= today.getTime()) {
      return { ok: false, errorKey: "wrongStage" }; // rule 11
    }
  }
  await prisma.leaveRequest.update({
    where: { id: owned.row.id },
    data: { status: "Cancelled", cancelledAt: new Date() },
  });
  return { ok: true };
}

export async function editRequest(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await editRequestCore(session, formData);
  revalidatePath("/employee");
  revalidatePath("/supervisor");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=updated` : `${home}?error=${result.errorKey}`);
}

export async function resubmitRequest(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await resubmitRequestCore(session, formData);
  revalidatePath("/employee");
  revalidatePath("/supervisor");
  revalidatePath("/hr");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=updated` : `${home}?error=${result.errorKey}`);
}

export async function cancelRequest(formData: FormData) {
  const session = await requireUser(ROLES);
  const result = await cancelRequestCore(session, readId(formData));
  revalidatePath("/employee");
  revalidatePath("/supervisor");
  revalidatePath("/hr");
  const home = ROLE_HOME[session.role];
  redirect(result.ok ? `${home}?done=cancelled` : `${home}?error=${result.errorKey}`);
}
