import { HomeShell } from "@/components/home-shell";
import { LeaveBanner, LeaveTable, toLeaveRowData } from "@/components/leave-table";
import { LeaveForm } from "@/components/leave-form";
import { EmployeeActions, SupervisorActions } from "@/components/request-actions";
import { requireUser } from "@/lib/auth/session";
import { submitOwnRequest } from "@/lib/leave/requests";
import { prisma } from "@/lib/prisma";

export default async function SupervisorHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser(["Supervisor"]);
  const { notice, done, error } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  // Rule 13: the queue holds rows naming this supervisor, plus the requests
  // they made themselves (flow rule 4: their own rows skip the supervisor
  // step and go straight to Pending HR). A request routed to another
  // supervisor never appears (or acts) here.
  const [requests, types] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { OR: [{ supervisorId: session.userId }, { employeeId: session.userId }] },
      include: {
        leaveType: true,
        employee: { select: { name: true } },
        supervisor: { select: { id: true, name: true } },
        hrOfficer: { select: { name: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.leaveType.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // Queue first: everything awaiting a signature, then current and past.
  requests.sort((a, b) => {
    const aPending = a.status === "Pending supervisor" ? 0 : 1;
    const bPending = b.status === "Pending supervisor" ? 0 : 1;
    return aPending - bPending;
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <HomeShell name={user?.name ?? "there"} showForbiddenNotice={notice === "forbidden"}>
        Sign or reject the requests waiting for you, and ask for your own
        leave below — your own requests go straight to HR.
      </HomeShell>

      <div className="mt-6 rounded-xl border border-line bg-white p-8 shadow-sm">
        <LeaveBanner done={done} error={error} />
        <h2 className="font-serif text-xl font-semibold">Team requests</h2>
        <div className="mt-4">
          <LeaveTable
            rows={requests
              .filter((r) => r.supervisorId === session.userId)
              .map(toLeaveRowData)}
            showEmployee
            renderActions={(row) => <SupervisorActions row={row} />}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-white p-8 shadow-sm">
        <h2 className="font-serif text-xl font-semibold">Your own requests</h2>
        <p className="mt-1 text-xs text-muted">
          Your own leave skips the signing step and goes straight to HR.
        </p>
        <div className="mt-4">
          <LeaveTable
            rows={requests
              .filter((r) => r.employeeId === session.userId)
              .map(toLeaveRowData)}
            showSupervisor
            renderActions={(row) => (
              <EmployeeActions row={row} types={types} supervisors={[]} />
            )}
          />
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-line bg-white p-8 shadow-sm">
        <h2 className="font-serif text-xl font-semibold">New leave request (for yourself)</h2>
        <div className="mt-4">
          <LeaveForm
            action={submitOwnRequest}
            types={types}
            supervisors={[]}
            showSupervisorPicker={false}
            submitLabel="Submit my request"
          />
        </div>
      </div>
    </div>
  );
}
