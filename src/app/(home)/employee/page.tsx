import { HomeShell } from "@/components/home-shell";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function EmployeeHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser(["Employee"]);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const { notice } = await searchParams;

  return (
    <HomeShell
      name={user?.name ?? "there"}
      showForbiddenNotice={notice === "forbidden"}
    >
      Your leave requests will appear here.
    </HomeShell>
  );
}
