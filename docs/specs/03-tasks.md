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
| To do | 1 | Database and the users table | High | — (design §1; sets up AC-08/09) |
| To do | 2 | Seed the six demo users | High | AC-08, AC-09 |
| To do | 3 | Lock the doors: protected pages, session check, header | High | AC-06 (stranger bullet) |
| To do | 4 | Login form: format check, generic error, lockout | High | AC-02, AC-03, AC-04 (bullets 1–3) |
| To do | 5 | Success path: session cookie, role homes, logout live | High | AC-01, AC-04 (last bullet), AC-05, AC-06, AC-07 |
| To do | 6 | Security pass | High | AC-05, design §6 review |
| To do | 7 | Full acceptance walk and commit | High | AC-01 … AC-09 |

---

## Task 1 – Database and the users table *(High)*

- **Goal:** A SQLite database exists, created from Prisma, with one empty `User` table holding exactly the fields of design §1.
- **Files:** `prisma/schema.prisma`
- **Check:** Run `npx prisma db push`, then `npx prisma studio` → the `User` table appears with `id`, `name`, `icNumber`, `email`, `passwordHash`, `role`, `division`, `designation`, `createdAt`, and `email` and `icNumber` are marked unique.
- **Traces:** Design §1 (table), §7 (commands); HRMS doc 7.2 "Users"; interview Q6 (seed is the only source of accounts, so the table must hold the 7.2 fields exactly).

## Task 2 – Seed the six demo users *(High)*

- **Goal:** `npm run db:seed` loads exactly the six people from design Reference B, with `password123` stored as a bcrypt hash; re-running it does not duplicate anyone.
- **Files:** `prisma/seed.ts`, `package.json` (add the `db:seed` script)
- **Check:** AC-08 and AC-09 as written: run the seed, open `npx prisma studio` → 6 rows, each password starts with `$2a$` and nowhere equals `password123`, `supervisor-2` and `hr-2` match the Reference B row; run the seed twice — still 6 rows.
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
- **Traces:** All of requirements §4; HRMS doc §8 step 6 ("Check"); AGENTS.md commit rule.
