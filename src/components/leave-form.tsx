"use client";

// New/edit request form (flow design §14). Type-conditional fields: the
// Other-leave-type box appears when the type needs it (the reason box is
// always shown — AC-11 sends a reason with Annual leave — and the server
// enforces which types require which field, flow rule 9). Server-side
// validation is the authority; this component is only convenience.

import { useState } from "react";

const INPUT =
  "w-full rounded-md border border-field bg-white px-3 py-2 text-sm text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const LABEL = "block text-xs font-medium text-muted";

export type LeaveFormProps = {
  action: (formData: FormData) => Promise<void>;
  types: { id: number; name: string }[];
  supervisors: { id: number; name: string }[];
  // Hidden for a Supervisor asking for themselves (flow rule 4 / Task 12).
  showSupervisorPicker: boolean;
  submitLabel?: string;
  // Set when the form edits an existing row (edit / edit & resubmit, flow
  // rule 12): the hidden id travels with the post and the fields prefill.
  requestId?: number;
  initialValues?: {
    leaveTypeId: number;
    supervisorId: number | null;
    startDate: string; // yyyy-mm-dd
    endDate: string;
    halfDay: string | null;
    otherLeaveType: string | null;
    reason: string | null;
  };
  confirmMessage?: string;
};

export function LeaveForm({
  action,
  types,
  supervisors,
  showSupervisorPicker,
  submitLabel = "Submit request",
  requestId,
  initialValues,
  confirmMessage = "Submit this leave request?",
}: LeaveFormProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(
    initialValues?.leaveTypeId ?? null,
  );
  const selectedTypeName = types.find((t) => t.id === selectedTypeId)?.name;

  return (
    <form
      action={action}
      className="flex flex-col gap-4"
      // FR-07: ask before submitting; dismissing changes nothing.
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {requestId !== undefined && <input type="hidden" name="id" value={requestId} />}
      <div>
        <label className={LABEL} htmlFor="leaveTypeId">
          Leave type
        </label>
        <select
          id="leaveTypeId"
          name="leaveTypeId"
          required
          className={INPUT + " mt-1"}
          onChange={(e) => setSelectedTypeId(Number(e.target.value) || null)}
        >
          <option value="">Choose a leave type…</option>
          {types.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {selectedTypeName === "Other" && (
        <div>
          <label className={LABEL} htmlFor="otherLeaveType">
            What is this leave for?
          </label>
          <input
            id="otherLeaveType"
            name="otherLeaveType"
            maxLength={500}
            defaultValue={initialValues?.otherLeaveType ?? ""}
            className={INPUT + " mt-1"}
            placeholder="Say what this leave is for"
          />
        </div>
      )}

      <div>
        <label className={LABEL} htmlFor="reason">
          Reason {selectedTypeName === "Compassionate leave" ? "(required)" : "(optional)"}
        </label>
        <textarea
          id="reason"
          name="reason"
          rows={2}
          maxLength={500}
          defaultValue={initialValues?.reason ?? ""}
          className={INPUT + " mt-1"}
          placeholder={
            selectedTypeName === "Compassionate leave"
              ? "Write a reason for compassionate leave"
              : "Anything the approver should know"
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LABEL} htmlFor="startDate">
            Start date
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            required
            defaultValue={initialValues?.startDate ?? ""}
            className={INPUT + " mt-1"}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="endDate">
            End date
          </label>
          <input
            id="endDate"
            name="endDate"
            type="date"
            required
            defaultValue={initialValues?.endDate ?? ""}
            className={INPUT + " mt-1"}
          />
        </div>
      </div>

      <fieldset className="rounded-md border border-line px-3 py-2">
        <legend className="px-1 text-xs text-muted">Half-day (single day only)</legend>
        <div className="flex gap-4 text-sm">
          <label>
            <input
              type="radio"
              name="halfDay"
              value=""
              defaultChecked={(initialValues?.halfDay ?? null) === null}
              className="mr-1"
            />
            Full days
          </label>
          {(["Morning", "Afternoon"] as const).map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="halfDay"
                value={option}
                defaultChecked={initialValues?.halfDay === option}
                className="mr-1"
              />
              {option}
            </label>
          ))}
        </div>
      </fieldset>

      {showSupervisorPicker && (
        <div>
          <label className={LABEL} htmlFor="supervisorId">
            Supervisor (from your division)
          </label>
          <select
            id="supervisorId"
            name="supervisorId"
            required
            defaultValue={initialValues?.supervisorId ?? ""}
            className={INPUT + " mt-1"}
          >
            <option value="">Choose a supervisor…</option>
            {supervisors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand/90"
      >
        {submitLabel}
      </button>
    </form>
  );
}
