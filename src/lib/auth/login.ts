"use server";

// Server actions for the login flow (design §5):
// login: validate -> lockout check -> lookup -> compare (rules 1-4).
// On success: mint the signed 8-hour session cookie and land on the
// user's role home (rules 5-7).

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isWorkEmail, normalizeEmail } from "@/lib/validate";
import { isLockedOut, registerFailure, registerSuccess } from "./lockout";
import { isRole, ROLE_HOME } from "./roles";
import { createSession, destroySession } from "./session";

// Compared when no user matches, so "unknown email" takes as long as
// "wrong password" and the generic message stays honest (rule 2, AC-03).
const TIMING_EQUALIZER_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function login(formData: FormData) {
  const rawEmail = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  // Rule 1: reject bad format before touching the database.
  if (!isWorkEmail(rawEmail)) {
    redirect("/login?error=format");
  }

  const email = normalizeEmail(rawEmail);

  // Rule 3: five failures in a row block the email for 15 minutes.
  if (isLockedOut(email)) {
    redirect("/login?error=locked");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = await bcrypt.compare(
    password,
    user?.passwordHash ?? TIMING_EQUALIZER_HASH,
  );

  if (!user || !passwordOk) {
    // Rule 2: one generic message for both failures.
    registerFailure(email);
    redirect("/login?error=credentials");
  }

  // The DB role must be one of the four known roles before it can mint a
  // cookie — a corrupted row must not grant access (design §6, A01).
  if (!isRole(user.role)) {
    redirect("/login?error=credentials");
  }

  registerSuccess(email);

  // Rules 5-7: signed 8-hour cookie, then the role home.
  await createSession({ id: user.id, role: user.role });
  redirect(ROLE_HOME[user.role]);
}

export async function logout() {
  await destroySession();
  redirect("/login?msg=loggedout");
}
