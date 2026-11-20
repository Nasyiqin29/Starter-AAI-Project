import { HomeShell } from "@/components/home-shell";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function AdminHome({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireUser(["Admin"]);
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  const { notice } = await searchParams;

  return (
    <HomeShell
      name={user?.name ?? "there"}
      showForbiddenNotice={notice === "forbidden"}
    >
      Every leave record will appear here — view only.
    </HomeShell>
  );
}
