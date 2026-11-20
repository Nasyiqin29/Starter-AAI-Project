// Shared requests table, status pills and banners (flow design §14/§17).
// Remarks and reasons are rendered as plain text — React escapes them, the
// XSS surface stays shut (flow §15). LeaveBanner also lives here: pages map
// ?done=/?error= keys to the exact Reference E strings.

import { formatDay, formatDateRange, formatDays } from "@/lib/leave/days";
import { countLeaveDays } from "@/lib/leave/days";
import {
  isDoneKey,
  isErrorKey,
  isLeaveStatus,
  LEAVE_MESSAGES,
  type LeaveStatus,
} from "@/lib/leave/status";

export type LeaveRowData = {
  id: number;
  status: unknown; // validated by isLeaveStatus at render time
  typeName: string;
  leaveTypeId: number;
  otherLeaveType: string | null;
  reason: string | null;
  startDate: Date;
  endDate: Date;
  halfDay: string | null;
  employeeName: string;
  supervisorId: number | null;
  supervisorName: string | null;
  hrOfficerName: string | null;
  supervisorRemark: string | null;
  hrRemark: string | null;
};

// Status pill colours (flow design §17).
const PILL: Record<LeaveStatus, string> = {
  "Pending supervisor": "border-brand/60 bg-brand/5 text-brand",
  Signed: "border-brand/60 bg-brand/5 text-brand",
  "Pending HR": "border-brand/60 bg-brand/5 text-brand",
  Approved: "border-brand bg-brand text-white",
  "Rejected by supervisor": "border-coral/40 bg-coral/10 text-coral",
  "Rejected by HR": "border-coral/40 bg-coral/10 text-coral",
  Cancelled: "border-muted/40 bg-muted/5 text-muted",
};

export function LeaveStatusPill({ status }: { status: unknown }) {
  const known = isLeaveStatus(status) ? status : null;
  const label = known ?? String(status ?? "—");
  const classes = known ? PILL[known] : "border-line text-muted";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-xs ${classes}`}>
      {label}
    </span>
  );
}

export function LeaveTable({
  rows,
  showEmployee = false,
  showSupervisor = false,
  showHr = false,
  renderActions,
}: {
  rows: LeaveRowData[];
  showEmployee?: boolean;
  showSupervisor?: boolean;
  showHr?: boolean;
  renderActions?: (row: LeaveRowData) => React.ReactNode;
}) {
  const hasActions = Boolean(renderActions);
  if (rows.length === 0) {
    return <p className="text-sm text-muted">No requests yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium">Dates</th>
            <th className="py-2 pr-3 font-medium">Days</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            {showEmployee && <th className="py-2 pr-3 font-medium">Employee</th>}
            {showSupervisor && <th className="py-2 pr-3 font-medium">Supervisor</th>}
            {showHr && <th className="py-2 pr-3 font-medium">HR officer</th>}
            <th className="py-2 pr-3 font-medium">Remarks</th>
            {hasActions && <th className="py-2 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-line/60 align-top">
              <td className="py-2 pr-3">
                {row.typeName}
                {row.typeName === "Other" && row.otherLeaveType ? (
                  <span className="block text-xs text-muted">({row.otherLeaveType})</span>
                ) : null}
                {row.reason ? (
                  <span className="block text-xs text-muted">{row.reason}</span>
                ) : null}
              </td>
              <td className="py-2 pr-3">{formatDateRange(row.startDate, row.endDate)}</td>
              <td className="py-2 pr-3">
                {formatDays(
                  countLeaveDays(row.startDate, row.endDate, (row.halfDay ?? null) as "Morning" | "Afternoon" | null),
                )}
                {row.halfDay ? <span className="block text-xs text-muted">{row.halfDay}</span> : null}
              </td>
              <td className="py-2 pr-3">
                <LeaveStatusPill status={row.status} />
              </td>
              {showEmployee && <td className="py-2 pr-3">{row.employeeName}</td>}
              {showSupervisor && <td className="py-2 pr-3">{row.supervisorName ?? "—"}</td>}
              {showHr && <td className="py-2 pr-3">{row.hrOfficerName ?? "—"}</td>}
              <td className="py-2 pr-3 text-xs">
                {row.supervisorRemark ? (
                  <span className="block">Supervisor: {row.supervisorRemark}</span>
                ) : null}
                {row.hrRemark ? <span className="block">HR: {row.hrRemark}</span> : null}
                {!row.supervisorRemark && !row.hrRemark ? <span className="text-muted">—</span> : null}
              </td>
              {renderActions && <td className="py-2">{renderActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Success/error banners driven by the redirect query (?done= / ?error=),
// mapped through the exact Reference E strings.
export function LeaveBanner({
  done,
  error,
}: {
  done?: string | string[];
  error?: string | string[];
}) {
  const doneKey = Array.isArray(done) ? done[0] : done;
  const errorKey = Array.isArray(error) ? error[0] : error;
  if (doneKey && isDoneKey(doneKey)) {
    return (
      <p
        role="status"
        className="mb-4 rounded-md border border-brand/40 bg-brand/10 px-4 py-2 text-sm text-brand"
      >
        {LEAVE_MESSAGES.done[doneKey]}
      </p>
    );
  }
  if (errorKey && isErrorKey(errorKey)) {
    return (
      <p
        role="alert"
        className="mb-4 rounded-md border border-coral/40 bg-coral/10 px-4 py-2 text-sm text-coral"
      >
        {LEAVE_MESSAGES.error[errorKey]}
      </p>
    );
  }
  return null;
}

// Shared row view used by all four role pages.
export function toLeaveRowData(row: {
  id: number;
  status: string;
  otherLeaveType: string | null;
  reason: string | null;
  startDate: Date;
  endDate: Date;
  halfDay: string | null;
  supervisorRemark: string | null;
  hrRemark: string | null;
  leaveType: { id: number; name: string };
  employee: { name: string };
  supervisor: { id: number; name: string } | null;
  hrOfficer: { name: string } | null;
}): LeaveRowData {
  return {
    id: row.id,
    status: row.status,
    typeName: row.leaveType.name,
    leaveTypeId: row.leaveType.id,
    otherLeaveType: row.otherLeaveType,
    reason: row.reason,
    startDate: row.startDate,
    endDate: row.endDate,
    halfDay: row.halfDay,
    employeeName: row.employee.name,
    supervisorId: row.supervisor?.id ?? null,
    supervisorName: row.supervisor?.name ?? null,
    hrOfficerName: row.hrOfficer?.name ?? null,
    supervisorRemark: row.supervisorRemark,
    hrRemark: row.hrRemark,
  };
}

export { formatDay };
