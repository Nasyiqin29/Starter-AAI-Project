import { MESSAGES } from "@/lib/auth/roles";

// Presentational shell shared by the four role homes (design §8).
// It shows the notice, greeting and placeholder only — every page still
// runs its own requireUser and database check (rule 6).

export function HomeShell({
  name,
  showForbiddenNotice,
  children,
}: {
  name: string;
  showForbiddenNotice: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-8 py-10">
      {showForbiddenNotice && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-coral/40 bg-coral/10 px-4 py-2 text-sm text-coral"
        >
          {MESSAGES.forbidden}
        </p>
      )}
      <div className="rounded-xl border border-line bg-white p-8 shadow-sm">
        <h1 className="font-serif text-3xl font-semibold">Hello, {name}.</h1>
        <p className="mt-3 text-sm text-muted">{children}</p>
      </div>
    </div>
  );
}
