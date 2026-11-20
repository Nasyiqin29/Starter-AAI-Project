import { HomeShell } from "@/components/home-shell";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function SupervisorHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser(["Supervisor"]);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const { notice } = await searchParams;

  return (
    <HomeShell
      name={user?.name ?? "there"}
      showForbiddenNotice={notice === "forbidden"}
    >
      Requests waiting for your signature will appear here.
    </HomeShell>
  );
}
