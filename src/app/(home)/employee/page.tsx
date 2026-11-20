import { HomeShell } from "@/components/home-shell";
import { LeaveBanner, LeaveTable, toLeaveRowData } from "@/components/leave-table";
import { LeaveForm } from "@/components/leave-form";
import { EmployeeActions } from "@/components/request-actions";
import { requireUser } from "@/lib/auth/session";
import { annualDaysUsed } from "@/lib/leave/balance";
import { submitRequest } from "@/lib/leave/requests";
import { prisma } from "@/lib/prisma";

export default async function EmployeeHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser(["Employee"]);
  const { notice, done, error } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  // Balance line (flow rule 10): days of Annual leave already booked this
  // calendar year (by start date) against the yearly entitlement.
  const annualDaysLeft = user
    ? user.annualLeaveEntitlement - (await annualDaysUsed(user.id, new Date().getUTCFullYear()))
    : 0;

  const [types, supervisors, requests] = await Promise.all([
    prisma.leaveType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      // Rule 3: the dropdown offers only Supervisors of the employee's own
      // division — the server action checks this again regardless.
      where: { role: "Supervisor", division: user?.division ?? "" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.leaveRequest.findMany({
      where: { employeeId: session.userId },
      include: {
        leaveType: true,
        employee: { select: { name: true } },
        supervisor: { select: { id: true, name: true } },
        hrOfficer: { select: { name: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <HomeShell name={user?.name ?? "there"} showForbiddenNotice={notice === "forbidden"}>
        Submit a leave request below; your current and past requests appear underneath.
      </HomeShell>

      <div className="mt-6 rounded-xl border border-line bg-white p-8 shadow-sm">
        <h2 className="font-serif text-xl font-semibold">New leave request</h2>
        <p className="mt-1 text-xs text-muted">
          {annualDaysLeft} of {user?.annualLeaveEntitlement ?? 14} Annual days left this year.
        </p>
        <div className="mt-4">
          <LeaveForm
            action={submitRequest}
            types={types}
            supervisors={supervisors}
            showSupervisorPicker
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-white p-8 shadow-sm">
        <LeaveBanner done={done} error={error} />
        <h2 className="font-serif text-xl font-semibold">Your requests</h2>
        <div className="mt-4">
          <LeaveTable
            rows={requests.map(toLeaveRowData)}
            showSupervisor
            renderActions={(row) => (
              <EmployeeActions row={row} types={types} supervisors={supervisors} />
            )}
          />
        </div>
      </div>
    </div>
  );
}
