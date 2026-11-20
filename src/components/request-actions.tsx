"use client";

// Action buttons shown on request rows (flow design §12/§13). Each action is
// a plain form posting to its server action; the server re-checks the actor,
// the stage and ownership on every call (rules 12-13). FR-07: every action
// that changes something pops the browser's native confirmation first — if
// it is dismissed the form never submits and the database is untouched.

import { useState } from "react";
import {
  approveRequest,
  cancelRequest,
  editRequest,
  rejectByHr,
  rejectBySupervisor,
  resubmitRequest,
  sendToHr,
  signRequest,
} from "@/lib/leave/requests";
import { LeaveForm } from "./leave-form";
import type { LeaveRowData } from "./leave-table";

const SIGN_BUTTON =
  "rounded-md bg-brand px-3 py-1 text-sm text-white hover:opacity-90";
const REJECT_BUTTON =
  "rounded-md border border-coral/50 px-3 py-1 text-sm text-coral hover:bg-coral/10";
const REMARK_FIELD =
  "w-full rounded-md border border-field bg-white px-2 py-1 text-xs text-ink placeholder:text-muted/70 focus:border-brand focus:outline-none";

// A form that only submits if the browser confirmation is accepted (FR-07).
function ConfirmForm({
  action,
  confirmMessage,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  confirmMessage: string;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {children}
    </form>
  );
}

export function SupervisorActions({ row }: { row: LeaveRowData }) {
  if (row.status !== "Pending supervisor") {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <div className="flex min-w-52 flex-col gap-2">
      <ConfirmForm action={signRequest} confirmMessage="Sign this leave request?">
        <input type="hidden" name="id" value={row.id} />
        <button type="submit" className={SIGN_BUTTON}>
          Sign
        </button>
      </ConfirmForm>
      <ConfirmForm
        action={rejectBySupervisor}
        confirmMessage="Reject this leave request with the remark above?"
      >
        <input type="hidden" name="id" value={row.id} />
        <textarea
          name="remark"
          rows={2}
          maxLength={500}
          required
          placeholder="Remark (required to reject)"
          aria-label={`Remark for rejecting request ${row.id}`}
          className={REMARK_FIELD}
        />
        <button type="submit" className={REJECT_BUTTON}>
          Reject
        </button>
      </ConfirmForm>
    </div>
  );
}

const PLAIN_BUTTON =
  "rounded-md border border-field px-3 py-1 text-sm text-ink hover:border-brand hover:text-brand";

const utcDay = (d: Date) => d.toISOString().slice(0, 10);

// Employee row (own requests, both the /employee table and the Supervisor's
// "your own" table). Buttons appear only where flow §10 allows; the server
// re-checks status and ownership at click time. Cancel and Withdraw share
// one action (rule 11); Withdraw only shows while the start date is future.
export function EmployeeActions({
  row,
  types,
  supervisors,
}: {
  row: LeaveRowData;
  types: { id: number; name: string }[];
  supervisors: { id: number; name: string }[];
}) {
  const [editing, setEditing] = useState<"edit" | "resubmit" | null>(null);
  const status = String(row.status);
  const isPendingSupervisor = status === "Pending supervisor";
  const isSigned = status === "Signed";
  const isPendingHr = status === "Pending HR";
  const isRejected = status === "Rejected by supervisor" || status === "Rejected by HR";
  const canWithdraw =
    status === "Approved" && utcDay(row.startDate) > utcDay(new Date());

  if (!isPendingSupervisor && !isSigned && !isPendingHr && !isRejected && !canWithdraw) {
    return <span className="text-xs text-muted">—</span>;
  }

  const editingForm = editing && (
    <LeaveForm
      action={editing === "edit" ? editRequest : resubmitRequest}
      types={types}
      supervisors={supervisors}
      showSupervisorPicker={supervisors.length > 0}
      submitLabel={editing === "edit" ? "Save changes" : "Save & resubmit"}
      requestId={row.id}
      confirmMessage={
        editing === "edit" ? "Save the changes to this request?" : "Save and resubmit this request?"
      }
      initialValues={{
        leaveTypeId: row.leaveTypeId,
        supervisorId: row.supervisorId,
        startDate: utcDay(row.startDate),
        endDate: utcDay(row.endDate),
        halfDay: row.halfDay,
        otherLeaveType: row.otherLeaveType,
        reason: row.reason,
      }}
    />
  );

  return (
    <div className="flex min-w-52 flex-col gap-2">
      {editing ? (
        <>
          {editingForm}
          <button type="button" className={PLAIN_BUTTON} onClick={() => setEditing(null)}>
            Close
          </button>
        </>
      ) : (
        <>
          {isPendingSupervisor && (
            <button type="button" className={PLAIN_BUTTON} onClick={() => setEditing("edit")}>
              Edit
            </button>
          )}
          {isRejected && (
            <button type="button" className={PLAIN_BUTTON} onClick={() => setEditing("resubmit")}>
              Edit &amp; resubmit
            </button>
          )}
          {isSigned && (
            <ConfirmForm action={sendToHr} confirmMessage="Send this request to HR?">
              <input type="hidden" name="id" value={row.id} />
              <button type="submit" className={SIGN_BUTTON}>
                Send to HR
              </button>
            </ConfirmForm>
          )}
          {(isPendingSupervisor || isSigned || isPendingHr) && (
            <ConfirmForm action={cancelRequest} confirmMessage="Cancel this request?">
              <input type="hidden" name="id" value={row.id} />
              <button type="submit" className={REJECT_BUTTON}>
                Cancel
              </button>
            </ConfirmForm>
          )}
          {canWithdraw && (
            <ConfirmForm
              action={cancelRequest}
              confirmMessage="Withdraw this approved request? It becomes Cancelled."
            >
              <input type="hidden" name="id" value={row.id} />
              <button type="submit" className={REJECT_BUTTON}>
                Withdraw
              </button>
            </ConfirmForm>
          )}
        </>
      )}
    </div>
  );
}

// HR row: either officer decides a Pending HR request (HRMS doc 5.3 rule 5).
export function HrActions({ row }: { row: LeaveRowData }) {
  if (row.status !== "Pending HR") {
    return <span className="text-xs text-muted">—</span>;
  }
  return (
    <div className="flex min-w-52 flex-col gap-2">
      <ConfirmForm action={approveRequest} confirmMessage="Approve this leave request?">
        <input type="hidden" name="id" value={row.id} />
        <button type="submit" className={SIGN_BUTTON}>
          Approve
        </button>
      </ConfirmForm>
      <ConfirmForm
        action={rejectByHr}
        confirmMessage="Reject this leave request with the remark above?"
      >
        <input type="hidden" name="id" value={row.id} />
        <textarea
          name="remark"
          rows={2}
          maxLength={500}
          required
          placeholder="Remark (required to reject)"
          aria-label={`Remark for rejecting request ${row.id}`}
          className={REMARK_FIELD}
        />
        <button type="submit" className={REJECT_BUTTON}>
          Reject
        </button>
      </ConfirmForm>
    </div>
  );
}
