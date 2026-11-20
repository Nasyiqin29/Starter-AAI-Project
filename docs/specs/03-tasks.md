# Leave Request — Login – Tasks

> **This file answers:** In what order do we build login, and how do we check each step?
> **Who:** The AI drafted it from `01-requirements.md` and `02-design.md`. You review it.
>
> Build one task at a time, in order. When a task is done, the AI changes its
> Status to Done. At the end, you check the whole app against the specs.
> If something is wrong, fix the spec first, then ask the AI to rebuild.

**Priority.** Every task is **High**, **Medium** or **Low**. Do High first.
Do Low only if time is left, and only if you ask.

**Not in this list.** U9/AC-10 (Admin user management) — design rule 9 defers it
until its own spec exists. When that spec is agreed, add its tasks below Task 7.

| Status | # | Task | Priority | Checks (from requirements §4) |
|--------|---|------|----------|-------------------------------|
| Done | 1 | Database and the users table | High | — (design §1; sets up AC-08/09) |
| Done | 2 | Seed the six demo users | High | AC-08, AC-09 |
| Done | 3 | Lock the doors: protected pages, session check, header | High | AC-06 (stranger bullet) |
| Done | 4 | Login form: format check, generic error, lockout | High | AC-02, AC-03, AC-04 (bullets 1–3) |
| Done | 5 | Success path: session cookie, role homes, logout live | High | AC-01, AC-04 (last bullet), AC-05, AC-06, AC-07 |
| Done | 6 | Security pass | High | AC-05, design §6 review |
| Done | 7 | Full acceptance walk and commit | High | AC-01 … AC-09 |

---

## Task 1 – Database and the users table *(High)*

- **Goal:** A SQLite database exists, created from Prisma, with one empty `User` table holding exactly the fields of design §1.
- **Files:** `prisma/schema.prisma`
- **Check:** Run `npx prisma db push`, then `npx prisma studio` → the `User` table appears with `id`, `name`, `icNumber`, `email`, `passwordHash`, `role`, `division`, `designation`, `createdAt`, and `email` and `icNumber` are marked unique.
- **Traces:** Design §1 (table), §7 (commands); HRMS doc 7.2 "Users"; interview Q6 (seed is the only source of accounts, so the table must hold the 7.2 fields exactly).

## Task 2 – Seed the six demo users *(High)*

- **Goal:** `npm run db:seed` loads exactly the six people from design Reference B, with `password123` stored as a bcrypt hash; re-running it does not duplicate anyone.
- **Files:** `prisma/seed.ts`, `package.json` (add the `db:seed` script)
- **Check:** AC-08 and AC-09 as written: run the seed, open `npx prisma studio` → 6 rows, each password starts with `$2a$` or `$2b$` and nowhere equals `password123`, `supervisor-2` and `hr-2` match the Reference B row; run the seed twice — still 6 rows.
- **Traces:** U8, AC-08, AC-09; design rule 4, rule 9, Reference B; HRMS doc 7.2 demo table (all six accounts log in with `password123`).

## Task 3 – Lock the doors: protected pages, session check, header *(High)*

- **Goal:** The five routes exist (`/`, four role homes) with the shared header (name, email, "Log out") and `requireUser`; with nobody able to log in yet, every protected page bounces strangers to `/login`, and the app refuses to start without `SESSION_SECRET`.
- **Files:** `src/lib/auth/session.ts` (sign/verify/create/destroy/`requireUser`), `src/lib/auth/roles.ts`, `src/lib/auth/login.ts` (logout action only), `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/(home)/employee/page.tsx`, `src/app/(home)/supervisor/page.tsx`, `src/app/(home)/hr/page.tsx`, `src/app/(home)/admin/page.tsx`, `.env` (git-ignored) and `.env.example`
- **Check:** With no cookie set, open `http://localhost:3000/employee` (then `/supervisor`, `/hr`, `/admin`) → each redirects to `/login`. `/` also redirects to `/login`. Delete `SESSION_SECRET` from `.env` → the app refuses to start.
- **Traces:** U3 (boundary), design rule 6 (server-side check), rule 5 (signed cookie, secret), rule 7 (routes); AC-06 first bullet; HRMS doc FR-01, 5.3 rule 1.

## Task 4 – Login form: format check, generic error, lockout *(High)*

- **Goal:** `/login` shows the email + password form. Submitting runs the server action through rule 1 (format), rule 3 (lockout), then the database lookup and bcrypt compare — and every path that isn't a success shows exactly the right message, so **nobody can log in yet** (that is Task 5).
- **Files:** `src/app/login/page.tsx`, `src/lib/auth/login.ts` (add the login action), `src/lib/auth/lockout.ts`, `src/lib/validate.ts`
- **Check:** AC-02 as written (`employee-1@gmail.com` and `not-an-email` → "Use your @budiman.com work email", no database access). AC-03 (wrong password vs unknown email → word-for-word identical "Invalid email or password"). AC-04 first three bullets (5 fails → 6th correct attempt → "Too many failed attempts. Try again in 15 minutes.").
- **Traces:** U6, U7; AC-02, AC-03, AC-04; design rules 1, 2, 3, 10; HRMS doc 7.2 (email is the login), 7.5/FR-10 (OWASP A07).

## Task 5 – Success path: session cookie, role homes, logout live *(High)*

- **Goal:** Correct credentials now mint the signed 8-hour cookie and redirect to the right role home; already-logged-in users hitting `/login` go to their home; the header's "Log out" clears the session; wrong-role visits bounce with the notice. All six demo accounts work.
- **Files:** `src/lib/auth/login.ts` (finish the success path), `src/lib/auth/session.ts` (`createSession`, `destroySession` — small edits at most)
- **Check:** AC-01 (all four demo logins land on their home). AC-05 (DevTools → cookie `session`: `HttpOnly`, `SameSite=Lax`, path `/`, expiry ≈ 8 hours, value not a plain user id). AC-06 both bullets (logged-out `/hr` → `/login`; employee typing `/hr` → bounced to `/employee` with "You are not allowed to view that page"). AC-07 (logout → `/login` with "You have been logged out"; Back button shows `/login`). AC-04 last bullet (after the wait, correct login succeeds — also proves the counter resets).
- **Traces:** U1, U2, U4, U5; AC-01, AC-04–AC-07; design rules 5, 6, 7, 8; HRMS doc FR-01.

## Task 6 – Security pass *(High)*

- **Goal:** The design §6 promises are verified, not assumed: tampered cookies are rejected, secrets are safe, no password leaks anywhere.
- **Files:** none — review and fix only
- **Check:** Edit the `session` cookie's value by hand in DevTools → behaves as logged out (signature fails). `git check-ignore .env` → ignored; `.env.example` contains only the placeholder. Delete `SESSION_SECRET` → app refuses to start (design §6, rule 5). Search the codebase for the strings `password123` outside `prisma/seed.ts` and for any logging of passwords → none. Confirm no API routes or auth libraries were added (design §3).
- **Traces:** U6, design §6, rules 2, 4, 5, 10; HRMS doc FR-10, 7.5 (OWASP A01, A02, A03, A05, A07).

## Task 7 – Full acceptance walk and commit *(High)*

- **Goal:** Every acceptance check in `01-requirements.md` §4 is run by hand, in order, and ticked from "To do" to Done; the whole login story is demonstrated end to end; work is committed.
- **Files:** `docs/specs/01-requirements.md` (tick the ACs), `docs/specs/03-tasks.md` (Status → Done)
- **Check:** Walk AC-01 → AC-09 exactly as written, using only the six demo accounts. Anything that fails: fix the spec first, then the code (template rule). Commit each task with a Conventional Commits message (`feat: …`, `docs: …`).
  - *Walk done 20/11/2026: AC-01 … AC-09 all ticked in `01-requirements.md` §4. AC-04's 15-minute wait was verified by advancing the clock in a unit test of the lockout module (restart also clears the counter, per design rule 3). Commits were held back on request — commit when asked.*
- **Traces:** All of requirements §4; HRMS doc §8 step 6 ("Check"); AGENTS.md commit rule.

---

# Leave Request — Flow – Tasks

> **This section answers:** In what order do we build the leave flow, and how do we check each step?
> **Who:** The AI drafted it from `01-requirements.md` §6–§10 and `02-design.md` §9–§17. You review it.
>
> Numbering continues from the login tasks: the flow's tasks are 8–18. Build
> one at a time, in order. When a task is done, the AI changes its Status to
> Done. Fix the spec first, then the code.

**Priority.** High tasks first, then Medium, then Low. Tasks 16–17 are the
Low extras (FR-09) and run near the end; Task 18 is High but is the closing
walk, so it runs last of all.

**Not in this list.** Certificate upload (dropped — the document never asks
for it), Admin management of leave types (Admin stays view-only), Admin
setting the annual entitlement (waits for U9's own spec).

| Status | # | Task | Priority | Checks (from requirements §9) |
|--------|---|------|----------|-------------------------------|
| Done | 8 | Database: leave types, leave requests, annual entitlement | High | — (design §9; sets up AC-11 … AC-26) |
| Done | 9 | Seed the five leave types and the entitlement | High | (sets up AC-11, AC-25) |
| Done | 10 | Employee submits: form, own list, working-day/half-day count | High | AC-11, AC-12, AC-22 |
| Done | 11 | Supervisor queue: sign and reject with remark | High | AC-13, AC-14 |
| Done | 12 | Send to HR + HR queue: approve/reject, decider recorded, supervisor's own leave | High | AC-15, AC-16, AC-23 |
| Done | 13 | Confirmations and success messages on every flow action | High | AC-18 |
| Done | 14 | Employee tracking: edit, cancel, withdraw, resubmit | Medium | AC-17, AC-19, AC-20, AC-21 |
| Done | 15 | Admin view-only list of every record | Medium | AC-24 |
| Done | 16 | Annual leave balance cap | Low | AC-25 |
| Done | 17 | Email notifications with dev-log fallback | Low | AC-26 |
| Done | 18 | Flow security pass and full acceptance walk | High | AC-11 … AC-26 |

---

## Task 8 – Database: leave types, leave requests, annual entitlement *(High)*

- **Goal:** The schema gains `LeaveType` and `LeaveRequest` exactly as design §9 (including `User.annualLeaveEntitlement`, default 14), and the SQLite file is updated. Days are not stored; statuses are plain text from the §10 list.
- **Files:** `prisma/schema.prisma`
- **Check:** `npx prisma db push`, then `npx prisma studio` → `LeaveType` has `id`, `name` (unique), `sortOrder`, `active`; `LeaveRequest` has every §9 field — `employeeId`, `supervisorId` (nullable), `leaveTypeId`, `otherLeaveType`, `reason`, `startDate`, `endDate`, `halfDay`, `status`, `supervisorRemark`, `hrOfficerId`, `hrRemark`, `submittedAt`, `signedAt`, `decidedAt`, `cancelledAt` — and **no days column**; `User` shows `annualLeaveEntitlement` defaulting to 14.
- **Traces:** Design §9; HRMS doc 7.2 "Leave requests" (every 7.2 field is present); interview Q3 (halfDay), Q7 (entitlement field), Q8 (no date validation beyond end ≥ start — dates are plain dates).

## Task 9 – Seed the five leave types and the entitlement *(High)*

- **Goal:** `npm run db:seed` upserts exactly the five Reference C types in order, and every user has `annualLeaveEntitlement` = 14; re-running never duplicates.
- **Files:** `prisma/seed.ts`
- **Check:** Run the seed twice, then `npx prisma studio` → `LeaveType` holds exactly Annual leave, Maternity leave, Unpaid leave, Compassionate leave, Other (sortOrder 1–5, all active); all six users show 14; still six users, five types.
- **Traces:** Design §9 (LeaveType), Reference C, Reference D; interview Q1 (five document types, fixed list); HRMS doc 7.2 "Leave types".

## Task 10 – Employee submits: form, own list, working-day/half-day count *(High)*

- **Goal:** `/employee` shows the employee's own requests table and a working **New request** form: type dropdown from the seeded list, conditional `otherLeaveType`/`reason` fields, dates, half-day radios, and a supervisor dropdown of own-division Supervisors only. Submitting runs the server action (validate → create as `Pending supervisor` → success message). `days.ts` computes working days and 0.5 half-days.
- **Files:** `src/lib/leave/days.ts`, `src/lib/leave/validate.ts`, `src/lib/leave/requests.ts` (start with `submitRequest`), `src/lib/leave/status.ts` (constants), `src/components/leave-form.tsx`, `src/components/leave-table.tsx`, `src/app/(home)/employee/page.tsx`
- **Check:** AC-11 (submit Annual leave next Mon–Tue as employee-1 → success message, row shows **Pending supervisor**, supervisor-1's page shows it), AC-12 (dropdown lists only Supervisor 1 and 2; DevTools-replay with hr-1's id → "Pick a supervisor from your own division", no row), AC-22 (Fri–Mon shows 2 days; Sat–Fri 5; single day 1; half-day 0.5; end-before-start rejected with the exact string; last week's dates accepted).
- **Traces:** L1, L11; FR-02; design rules 3, 5, 7, 8, 9, 14; §9, §12; HRMS doc 5.3 rules 2–3, 7.2 (type, other type, dates, end ≥ start, division-matched supervisor).

## Task 11 – Supervisor queue: sign and reject with remark *(High)*

- **Goal:** `/supervisor` lists rows routed to the signed-in supervisor (`Pending supervisor` first, then current and past). **Sign** sets `Signed` + `signedAt`; **Reject** requires a remark and sets `Rejected by supervisor` + `supervisorRemark`. Only rows naming this supervisor appear or act.
- **Files:** `src/lib/leave/requests.ts` (add `signRequest`, `rejectBySupervisor`), `src/components/request-actions.tsx`, `src/app/(home)/supervisor/page.tsx`
- **Check:** AC-13 (sign → status **Signed**, employee-1's row now offers Send to HR), AC-14 (empty remark → "A remark is required when rejecting"; with remark → **Rejected by supervisor**, remark visible to employee-1). Also: rows routed to supervisor-2 never appear for supervisor-1.
- **Traces:** L2, L5; FR-03, FR-06; design rules 5, 6, 13; §10; HRMS doc 5.2 (Signed), 6 FR-03 ("a rejection needs a remark").

## Task 12 – Send to HR + HR queue: approve/reject, decider recorded, supervisor's own leave *(High)*

- **Goal:** The employee's **Send to HR** action moves their own `Signed` row to `Pending HR`. `/hr` lists all `Pending HR` rows first, then full history with the deciding officer shown. Either HR officer **Approves** (→ `Approved`, `hrOfficerId`, `decidedAt`) or **Rejects** with a remark (→ `Rejected by HR`, `hrRemark`). A Supervisor submitting for themselves gets a form without the supervisor dropdown, and the row starts at `Pending HR`.
- **Files:** `src/lib/leave/requests.ts` (add `sendToHr`, `approveRequest`, `rejectByHr`), `src/app/(home)/hr/page.tsx`, `src/components/request-actions.tsx`, `src/components/leave-form.tsx` (supervisor role hides the dropdown)
- **Check:** AC-15 (send → **Pending HR**; hr-2 approves; `npx prisma studio` shows `hrOfficerId` = hr-2's id and `decidedAt` set), AC-16 (empty HR remark refused; with remark → **Rejected by HR** visible to employee and Admin), AC-23 (supervisor-1's own request lands in the HR queue with no supervisor step and no sign button for them).
- **Traces:** L3, L4, L8; FR-04, FR-05; design rules 4, 6, 13; §10; HRMS doc 5.3 rule 5 ("either HR officer can decide, and the system records who did").

## Task 13 – Confirmations and success messages on every flow action *(High)*

- **Goal:** All nine actions that change something — Submit, Edit, Resubmit, Send to HR, Sign, Reject, Approve, Cancel and Withdraw — pop a browser confirmation first and land with the exact Reference E success banner afterwards (Reference E says which string each action shows). Dismissing the confirmation changes nothing in the database.
- **Files:** `src/components/request-actions.tsx` (wrap every action), the four role pages if banners need wiring
- **Check:** AC-18 as written — walk all nine actions; for each, dismiss the dialog (row unchanged) then accept (banner shows the exact Reference E string for that action).
- **Traces:** L6; FR-07; design §12, Reference E; HRMS doc 5.3 rule 7, FR-07.

## Task 14 – Employee tracking: edit, cancel, withdraw, resubmit *(Medium)*

- **Goal:** Complete the §10 moves on `/employee`: edit own `Pending supervisor` rows in place; cancel from `Pending supervisor` / `Signed` / `Pending HR`; withdraw an `Approved` row only before its start date; **Edit & resubmit** a rejected row back to `Pending supervisor`. Buttons appear only where §10 allows, and the actions re-check status at click time.
- **Files:** `src/lib/leave/requests.ts` (add `editRequest`, `resubmitRequest`, `cancelRequest`), `src/lib/leave/status.ts` (transition table), `src/components/request-actions.tsx`, `src/app/(home)/employee/page.tsx`
- **Check:** AC-21 (edit pending; resubmit rejected returns to **Pending supervisor** with the original remark still shown), AC-20 (cancel pending → **Cancelled**; withdraw next-month approved → **Cancelled**; withdraw today's approved refused; Cancelled offers nothing), AC-19 (DevTools-invoke another user's row → refused with "You cannot act on that request"; hr approving a `Pending supervisor` row → refused with "This request can no longer be changed"), AC-17 (each role's current + past list shows status and remarks; cross-role URL bounce).
- **Traces:** L5, L9, L10; design §10, rules 5, 11, 12, 13; interview Q5 (cancel incl. approved-before-start), Q6 (edit pending, reject→resubmit); HRMS doc 5.2.

## Task 15 – Admin view-only list of every record *(Medium)*

- **Goal:** `/admin` lists every leave request from every division — employee, type, dates, days, status, remarks, deciding officer — filterable by status, type and division, with zero action buttons.
- **Files:** `src/app/(home)/admin/page.tsx`, `src/components/leave-table.tsx` (shared table reuse)
- **Check:** AC-24 (Admin sees rows from other divisions and remarks; no buttons anywhere; a DevTools-invoke of any leave action as Admin is refused by the rule 13 check).
- **Traces:** L7; FR-08; design §12, §13; HRMS doc 5.3 rule 6 ("the admin can see every request but changes nothing").

## Task 16 – Annual leave balance cap *(Low)*

- **Goal:** Annual submissions/edits beyond the remaining yearly entitlement are blocked with the exact message; the other four types are uncapped; Cancelled/Rejected rows free their days. Uses `balance.ts` inside the submit/edit actions (one action reads and writes).
- **Files:** `src/lib/leave/balance.ts`, `src/lib/leave/requests.ts` (call it in `submitRequest`, `editRequest`, `resubmitRequest`), `/employee` balance display ("X of 14 Annual days left")
- **Check:** AC-25 as written: 14-day Annual accepted; one more day → "Not enough Annual leave days left"; after cancelling the big row the extra day passes; 20 days Unpaid accepted.
- **Traces:** L12; design §9 (entitlement), rule 10; interview Q7 (Annual capped at 14, pending counts, other types uncapped).

## Task 17 – Email notifications with dev-log fallback *(Low)*

- **Goal:** `notify.ts` sends (or logs, when SMTP env vars are absent) four kinds of email: new request → the chosen supervisor; signed or rejected by the supervisor → the employee; sent to HR → the HR officers; approved or rejected by HR → the employee. Recipients come from the database only; mail failures never block the action.
- **Files:** `src/lib/notify.ts`, `src/lib/leave/requests.ts` (call after each successful action), `.env.example` (optional SMTP keys)
- **Check:** AC-26: with no SMTP settings, submitting as employee-1 logs `[email] to supervisor-1@budiman.com: New leave request …` and hr-2's approval logs `[email] to employee-1@budiman.com: Request approved …`. With bogus SMTP settings, the action still succeeds.
- **Traces:** L13; design rule 15; interview Q9 (email notifications, dev fallback); FR-09 (extra, spec first — done in this section).

## Task 18 – Flow security pass and full acceptance walk *(High)*

- **Goal:** Design §15's promises are verified, not assumed, and AC-11 → AC-26 are walked by hand in order and ticked from "To do"; work is committed with Conventional Commits messages.
- **Files:** `docs/specs/01-requirements.md` (tick the ACs), this file (Status → Done)
- **Check:** Security: DevTools-replay each of the nine actions with a forged row id belonging to another employee → all refused with "You cannot act on that request"; as Admin, every action refused with the same string; post a forged `status` value in a form → ignored (status never read from input); set a row's status in Prisma Studio to something outside §10 → the app shows it inert, no action possible; grep the codebase — no file-upload code exists. Walk: AC-11 … AC-26 exactly as written, using only the six demo accounts. Commit each task (`feat: …`, `fix: …`, `docs: …`).
- **Traces:** Design §15; HRMS doc 7.5 (OWASP A01, A03, A05, A08), FR-10; requirements §9 in full; HRMS doc §8 step 6 ("Check"); AGENTS.md commit rule.
