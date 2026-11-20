import type { Metadata } from "next";
import "./globals.css";
import { logout } from "@/lib/auth/login";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Budiman HRMS",
  description: "Leave Request module for Budiman Company.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The header shows only when a valid session exists (design §5).
  const session = await getSession();
  const user = session
    ? await prisma.user.findUnique({
        where: { id: session.userId },
        select: { name: true, email: true },
      })
    : null;

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-cream font-sans text-ink antialiased">
        {user && (
          <header className="flex items-center justify-between border-b border-line bg-cream px-8 py-4">
            <span className="font-serif text-lg font-semibold">
              Budiman HRMS
              <span className="ml-3 align-middle font-sans text-sm font-normal text-muted">
                {user.name} ({user.email})
              </span>
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-md border border-field bg-white px-4 py-1.5 text-sm text-ink hover:border-brand hover:text-brand"
              >
                Log out
              </button>
            </form>
          </header>
        )}
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
