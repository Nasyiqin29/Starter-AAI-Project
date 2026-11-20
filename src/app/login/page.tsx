import { redirect } from "next/navigation";
import { login } from "@/lib/auth/login";
import { MESSAGES, ROLE_HOME } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";

// Map the URL's ?error= code to the exact words of design Reference A.
const ERROR_MESSAGES: Record<string, string> = {
  format: MESSAGES.wrongFormat,
  credentials: MESSAGES.invalidCredentials,
  locked: MESSAGES.locked,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Already logged in? Straight to your own home (design §4).
  const session = await getSession();
  if (session) redirect(ROLE_HOME[session.role]);

  const { error, msg } = await searchParams;
  const errorMessage =
    typeof error === "string" ? ERROR_MESSAGES[error] : undefined;
  const loggedOut = msg === "loggedout";

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Decorative coral panel (design §8) — pure CSS, no artwork. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] md:block"
      >
        <div className="absolute inset-y-[-5%] right-[-8%] left-[28%] bg-coral" />
        <div className="absolute right-[28%] top-[7%] aspect-square w-[42%] rounded-full bg-coral" />
        <div className="absolute bottom-[5%] right-[28%] aspect-square w-[50%] rounded-full bg-coral" />
        <div className="absolute right-[12%] top-[40%] aspect-square w-[16%] rounded-full bg-coral-light" />
      </div>

      <div className="relative z-10 flex w-full flex-col px-8 py-8 md:w-[58%] lg:px-16">
        <span className="font-serif text-xl font-semibold">Budiman HRMS</span>

        <div className="mt-12 md:mt-16">
          <h1 className="font-serif text-4xl font-semibold tracking-tight lg:text-5xl">
            Welcome back!
          </h1>

          <div className="mt-8 w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-[0_10px_35px_rgba(29,17,69,0.08)]">
            <h2 className="text-base font-semibold">Sign into Budiman HRMS</h2>
            <p className="mt-1 text-xs text-muted">
              Leave Request module — sign in with your work account.
            </p>

            {loggedOut && (
              <p
                role="status"
                className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
              >
                {MESSAGES.loggedOut}
              </p>
            )}
            {errorMessage && (
              <p
                role="alert"
                className="mt-4 rounded-md border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-coral"
              >
                {errorMessage}
              </p>
            )}

            <form action={login} className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-xs font-medium">
                Email
                {/* type=text on purpose: format is checked on the server (rule 1),
                    not by the browser, so the server message is always shown. */}
                <input
                  name="email"
                  type="text"
                  inputMode="email"
                  autoComplete="username"
                  required
                  className="rounded-md border border-field px-3 py-2 text-sm font-normal text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-medium">
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="rounded-md border border-field px-3 py-2 text-sm font-normal text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              <button
                type="submit"
                className="mt-1 w-full rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark"
              >
                Log in
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
