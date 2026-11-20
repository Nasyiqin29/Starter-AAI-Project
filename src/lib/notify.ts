// Email notifications (flow rule 15, L13): four kinds of mail, recipients
// read only from the users table — never from the form. With SMTP_* set in
// .env nodemailer sends; without them the mail is logged as
// `[email] to <address>: <subject>` on the dev console. A mail failure is
// logged and swallowed: it never blocks or reverses the action that
// triggered it. Mail content never contains passwords or secrets.

import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

type Mail = { to: string; subject: string; body: string };

export async function sendLeaveEmail(mail: Mail): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !port || !user || !pass) {
    // Dev fallback: the console stands in for the mail server (rule 15).
    console.log(`[email] to ${mail.to}: ${mail.subject}`);
    return;
  }
  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "Budiman HRMS <hrms@budiman.com>",
      to: mail.to,
      subject: mail.subject,
      text: mail.body,
    });
  } catch (err) {
    // Rule 15: a failed send must not affect the leave request.
    console.error(`[email] FAILED to ${mail.to}: ${(err as Error).message}`);
  }
}

// ---- The four triggers (tasks 10-14 call these after a success) ----

async function emailOf(userId: number): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return u?.email ?? null;
}

export type NotifiedRequest = {
  id: number;
  employeeId: number;
  employeeName: string;
  supervisorId: number | null;
  typeName: string;
  dates: string; // human range, e.g. "7 Dec 2026 – 8 Dec 2026"
  days: string; // e.g. "2 days"
};

function summary(r: NotifiedRequest): string {
  return `Request #${r.id}: ${r.typeName}, ${r.dates} (${r.days}), from ${r.employeeName}. Sign in to Budiman HRMS to see it.`;
}

// 1. New request -> the chosen supervisor (a Supervisor's own request has no
// supervisor and gets no mail here; HR sees it in the queue).
export async function notifyNewRequest(r: NotifiedRequest): Promise<void> {
  if (r.supervisorId === null) return;
  const to = await emailOf(r.supervisorId);
  if (to) await sendLeaveEmail({ to, subject: `New leave request from ${r.employeeName}`, body: summary(r) });
}

// 2. Signed or rejected by the supervisor -> the employee.
export async function notifyEmployee(
  r: NotifiedRequest,
  subject: string,
  extra?: string,
): Promise<void> {
  const to = await emailOf(r.employeeId);
  if (to) {
    await sendLeaveEmail({ to, subject, body: `${summary(r)}${extra ? ` Remark: ${extra}` : ""}` });
  }
}

// 3. Sent to HR -> every HR officer (shared queue).
export async function notifyHrOfficers(r: NotifiedRequest): Promise<void> {
  const officers = await prisma.user.findMany({
    where: { role: "HR" },
    select: { email: true },
  });
  for (const o of officers) {
    await sendLeaveEmail({
      to: o.email,
      subject: `New leave request for HR review: ${r.employeeName}`,
      body: summary(r),
    });
  }
}
