// Signed session cookie (design rule 5): the cookie holds only userId,
// role and an 8-hour expiry, signed with HMAC-SHA256 using SESSION_SECRET.
// requireUser (rule 6) is the check every protected page and action calls.

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRole, ROLE_HOME, type Role } from "./roles";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // one working day

export type Session = {
  userId: number;
  role: Role;
  exp: number; // unix seconds
};

const SECRET_MIN_LENGTH = 32;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < SECRET_MIN_LENGTH) {
    throw new Error(
      `SESSION_SECRET is missing or shorter than ${SECRET_MIN_LENGTH} characters. ` +
        "Set a long random value in .env (see .env.example).",
    );
  }
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", getSecret()).update(body).digest("base64url");
}

export function createSessionToken(session: Session): string {
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string): Session | null {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra) return null;

  const expected = createHmac("sha256", getSecret()).update(body).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null; // tampered: treat as logged out
  }

  let payload: Session;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
  if (typeof payload.userId !== "number" || !isRole(payload.role) || typeof payload.exp !== "number") {
    return null;
  }
  if (payload.exp * 1000 <= Date.now()) return null; // expired
  return payload;
}

export async function getSession(): Promise<Session | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

export async function createSession(user: { id: number; role: Role }): Promise<void> {
  const token = createSessionToken({
    userId: user.id,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// Call this first in every protected page and server action.
// Stranger -> /login. Right cookie, wrong role -> own home with the notice.
export async function requireUser(roles: readonly Role[]): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!roles.includes(session.role)) {
    redirect(`${ROLE_HOME[session.role]}?notice=forbidden`);
  }
  return session;
}
