import { HomeShell } from "@/components/home-shell";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function HrHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser(["HR"]);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const { notice } = await searchParams;

  return (
    <HomeShell
      name={user?.name ?? "there"}
      showForbiddenNotice={notice === "forbidden"}
    >
      The shared HR queue will appear here.
    </HomeShell>
  );
}
