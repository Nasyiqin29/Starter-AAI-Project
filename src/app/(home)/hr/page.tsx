import { HomeShell } from "@/components/home-shell";
import { LeaveBanner, LeaveTable, toLeaveRowData } from "@/components/leave-table";
import { HrActions } from "@/components/request-actions";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function HrHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser(["HR"]);
  const { notice, done, error } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });

  // Shared queue: every request is visible to both HR officers; the rows
  // awaiting a decision come first, then the full history.
  const requests = await prisma.leaveRequest.findMany({
    include: {
      leaveType: true,
      employee: { select: { name: true } },
      supervisor: { select: { id: true, name: true } },
      hrOfficer: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
  });
  requests.sort((a, b) => {
    const aQueue = a.status === "Pending HR" ? 0 : 1;
    const bQueue = b.status === "Pending HR" ? 0 : 1;
    return aQueue - bQueue;
  });

  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      <HomeShell name={user?.name ?? "there"} showForbiddenNotice={notice === "forbidden"}>
        Approve or reject the requests waiting in the queue; every officer
        sees the same list and the system records who decided.
      </HomeShell>

      <div className="mt-6 rounded-xl border border-line bg-white p-8 shadow-sm">
        <LeaveBanner done={done} error={error} />
        <h2 className="font-serif text-xl font-semibold">Leave queue</h2>
        <div className="mt-4">
          <LeaveTable
            rows={requests.map(toLeaveRowData)}
            showEmployee
            showSupervisor
            showHr
            renderActions={(row) => <HrActions row={row} />}
          />
        </div>
      </div>
    </div>
  );
}
