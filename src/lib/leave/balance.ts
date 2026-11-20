// Annual leave balance (flow rule 10): days used = the employee's own rows
// in the request's calendar year (by startDate) whose type is Annual leave
// and whose status still counts. Cancelled and Rejected rows are not in the
// list, so they free their days. The other four types are uncapped.

import { prisma } from "@/lib/prisma";
import { countLeaveDays } from "./days";
import { ANNUAL_TYPE_NAME, HALF_DAY_OPTIONS, type HalfDay } from "./status";

// Statuses that occupy days (design rule 10).
const COUNTED_STATUSES = ["Pending supervisor", "Signed", "Pending HR", "Approved"] as const;

function asHalfDay(value: string | null): HalfDay | null {
  return (HALF_DAY_OPTIONS as readonly string[]).includes(value ?? "")
    ? (value as HalfDay)
    : null;
}

// Working days of Annual leave the employee already has in `year`
// (UTC calendar year), ignoring one row so an edit does not count itself.
export async function annualDaysUsed(
  employeeId: number,
  year: number,
  exceptRowId?: number,
): Promise<number> {
  const rows = await prisma.leaveRequest.findMany({
    where: {
      employeeId,
      ...(exceptRowId !== undefined ? { id: { not: exceptRowId } } : {}),
      status: { in: [...COUNTED_STATUSES] },
      leaveType: { name: ANNUAL_TYPE_NAME },
      startDate: {
        gte: new Date(Date.UTC(year, 0, 1)),
        lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    },
    select: { startDate: true, endDate: true, halfDay: true },
  });
  return rows.reduce(
    (sum, r) => sum + countLeaveDays(r.startDate, r.endDate, asHalfDay(r.halfDay)),
    0,
  );
}

// True when the request fits. Non-Annual types always fit (rule 10).
export async function withinAnnualBalance(
  employeeId: number,
  leaveTypeName: string,
  entitlement: number,
  startDate: Date,
  endDate: Date,
  halfDay: HalfDay | null,
  exceptRowId?: number,
): Promise<boolean> {
  if (leaveTypeName !== ANNUAL_TYPE_NAME) return true;
  const used = await annualDaysUsed(employeeId, startDate.getUTCFullYear(), exceptRowId);
  const requested = countLeaveDays(startDate, endDate, halfDay);
  return used + requested <= entitlement;
}
