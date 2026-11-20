import { HomeShell } from "@/components/home-shell";
import { LeaveBanner, LeaveTable, toLeaveRowData } from "@/components/leave-table";
import { requireUser } from "@/lib/auth/session";
import { isLeaveStatus, STATUSES } from "@/lib/leave/status";
import { prisma } from "@/lib/prisma";

// /admin — the whole register, view only (§12/§13: the Admin has no write
// actions, so no action component is ever rendered here). Filters are plain
// GET form fields; the server turns them into a Prisma where clause.
export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser(["Admin"]);
  const { notice, done, error, status, type, division } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const pick = (v: string | string[] | undefined) =>
    typeof v === "string" && v ? v : undefined;

  const statusFilter = pick(status);
  const typeFilter = pick(type);
  const divisionFilter = pick(division);

  const [rows, types, divisionRows] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        ...(statusFilter && isLeaveStatus(statusFilter) ? { status: statusFilter } : {}),
        ...(typeFilter && Number.isInteger(Number(typeFilter))
          ? { leaveTypeId: Number(typeFilter) }
          : {}),
        ...(divisionFilter ? { employee: { division: divisionFilter } } : {}),
      },
      include: {
        leaveType: true,
        employee: { select: { name: true } },
        supervisor: { select: { id: true, name: true } },
        hrOfficer: { select: { name: true } },
      },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.leaveType.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({
      select: { division: true },
      distinct: ["division"],
      orderBy: { division: "asc" },
    }),
  ]);
  const divisions = divisionRows.map((d) => d.division).filter(Boolean) as string[];

  const SELECT =
    "rounded-md border border-field bg-white px-2 py-1.5 text-sm text-ink focus:border-brand focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-4xl px-8 py-10">
      <HomeShell name={user?.name ?? "there"} showForbiddenNotice={notice === "forbidden"}>
        Every leave request in the company, in one register — nothing here
        can be changed.
      </HomeShell>

      <div className="mt-6 rounded-xl border border-line bg-white p-8 shadow-sm">
        <LeaveBanner done={done} error={error} />
        <h2 className="font-serif text-xl font-semibold">All leave requests</h2>

        <form method="get" action="/admin" className="mt-4 flex flex-wrap items-center gap-3">
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className={SELECT}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={typeFilter ?? ""}
            className={SELECT}
            aria-label="Filter by leave type"
          >
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select
            name="division"
            defaultValue={divisionFilter ?? ""}
            className={SELECT}
            aria-label="Filter by division"
          >
            <option value="">All divisions</option>
            {divisions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-brand px-3 py-1.5 text-sm text-white hover:opacity-90"
          >
            Filter
          </button>
          <a href="/admin" className="text-sm text-muted underline hover:text-ink">
            Reset
          </a>
        </form>

        <div className="mt-4">
          <LeaveTable rows={rows.map(toLeaveRowData)} showEmployee showSupervisor showHr />
        </div>
      </div>
    </div>
  );
}
