# Leave Request — Login – Design

> **This file answers:** How is the login put together? (data, rules, screens,
> where the code lives)
> **Who:** The AI drafted it from `01-requirements.md`, the interview and document
> section 7. You review all of it.
>
> If this file and the requirements disagree, fix the requirements first,
> then this file.

## 1. Tables

### `User` – one row per person who can log in

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `name` | text | yes | Full name, e.g. "Supervisor 1" |
| `icNumber` | text | yes | Identity card number, format `xx-xxxxxx` (two digits, hyphen, six digits). Unique |
| `email` | text | yes | Work email, always ends `@budiman.com`. Unique. Lower-cased before storing; used to log in |
| `passwordHash` | text | yes | bcrypt hash of the password. Never the plain password |
| `role` | text | yes | One of the four roles in Reference A. Exactly one role per user |
| `division` | text | yes | One of the divisions in Reference A ("Admin" for the Admin user) |
| `designation` | text | yes | Job title from the division's list in Reference A |
| `createdAt` | date | auto | Set by the database when the row is created |

The session is **not** a table. It lives only in the signed cookie (rule 5),
which holds `userId`, `role` and an 8-hour expiry — nothing else. No other
tables exist yet; `LeaveRequest` arrives with the next design file.

## 2. Business rules

1. **Login is email + password.** The server first checks the email is well-formed and ends `@budiman.com` — if not, "Use your @budiman.com work email" is shown and the database is never touched. The IC number is never a login identifier.
2. **One generic failure message.** Wrong email and wrong password both give exactly "Invalid email or password", so nobody can discover which emails have accounts.
3. **Five failures lock the email.** Five consecutive failures for one email blocks further attempts for 15 minutes ("Too many failed attempts. Try again in 15 minutes."), even with the right password. The counter is in memory on the server (per email: fails + unlock time); a dev-server restart clears it. Success resets the counter.
4. **Passwords are bcrypt hashes.** Hashed with bcryptjs at build/seed time, cost 10. Login compares with the library, never with `==`. The plain password exists only in the form, only in memory.
5. **Session = signed cookie.** After a successful login the server sets cookie `session`: `userId`, `role` and an 8-hour expiry, signed with HMAC-SHA256 using `SESSION_SECRET` from `.env` (a random 32+ byte value, git-ignored; the app refuses to start without it). Cookie flags: `httpOnly`, `sameSite=lax`, `path=/`, `secure` in production, `Max-Age` 8 hours. Any tampering breaks the signature and counts as logged out. No "remember me".
6. **Every page and action checks the session server-side.** A shared helper (`requireUser(roles)` in `src/lib/auth/session.ts`) re-reads and verifies the cookie on every protected page and inside every server action — never relying on a hidden button or a redirect alone. Bad/expired cookie → `/login`. Right cookie, wrong role → back to the user's own home with "You are not allowed to view that page".
7. **Each role has exactly one home.** Employee `/employee`, Supervisor `/supervisor`, HR `/hr`, Admin `/admin` (Reference A maps them). After login, and when an outsider opens a protected page, these are where people land. `/` just redirects: to the role home if logged in, to `/login` if not.
8. **Logout is a server action.** The header button on every protected screen posts a logout action that clears the cookie and lands on `/login` with "You have been logged out". The Back button then shows `/login`, not the old page.
9. **Accounts come from the seed.** `prisma/seed.ts` loads exactly the six people in Reference B, emails lower-cased, `password123` hashed. It is idempotent: re-running it re-upserts the same six and removes none. Extra users (Admin screen, story U9) are out of this design until their own spec exists.
10. **Input is never trusted.** The login form posts only through a server action; the server re-validates email format and trims whitespace. All database reads go through Prisma parameterised queries — no string-built SQL.

## 3. Technology

| Part | Choice | In plain words |
|------|--------|----------------|
| Web framework | Next.js + TypeScript (App Router) | Screens and server logic in one project |
| Database | SQLite with Prisma | One file, no database server; Prisma does the queries safely |
| Styling | Tailwind CSS | Simple forms, header and tables, styles next to each screen |
| Login logic | Server actions (no separate API) | The login and logout forms post to functions in the same project |
| Session | Signed cookie (HMAC-SHA256, `SESSION_SECRET`) | Simple and safe, no extra accounts service, no session table |
| Passwords | bcryptjs, cost 10 | Hash on seed, compare on login; plain passwords never stored or logged |

## 4. Screens (routes)

| Route | Who | What it shows | Status |
|-------|-----|---------------|--------|
| `/` | anyone | Redirects: logged in → own role home; not logged in → `/login` | To do |
| `/login` | not logged in | Email + password form, the error messages of rules 1–3, and a quiet note that this is the Budiman leave system. If already logged in, redirects to own home. No demo passwords on screen | To do |
| `/employee` | Employee | Home: greeting with the user's name, a "your requests will appear here" placeholder (leave module comes next), header with name + "Log out" | To do |
| `/supervisor` | Supervisor | Home: greeting, placeholder for requests to sign, header with name + "Log out" | To do |
| `/hr` | HR | Home: greeting, placeholder for the HR queue, header with name + "Log out" | To do |
| `/admin` | Admin | Home: greeting, placeholder for the all-records view (view only, next module), header with name + "Log out". The user-management screen (U9) is **not** built until its own spec exists | To do |

Every protected page renders the same header (name, email, "Log out"), so
story U5 is testable from any screen.

## 5. Where the code lives

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | The `User` model exactly as section 1 |
| `prisma/seed.ts` | The six Reference B accounts, bcrypt-hashed, idempotent upserts |
| `src/lib/auth/session.ts` | Sign/verify the cookie; `createSession`, `destroySession`, `requireUser(roles)` used by every page and action |
| `src/lib/auth/login.ts` | Server actions: `login` (validate → lockout check → lookup → compare → set cookie) and `logout` |
| `src/lib/auth/roles.ts` | The four roles, their home routes, and their allowed routes — one place to look up "who may open what" |
| `src/lib/auth/lockout.ts` | In-memory fail counter and 15-minute lock (rule 3) |
| `src/lib/validate.ts` | `isWorkEmail` (`@budiman.com`), `isIcNumber` (`xx-xxxxxx`), trim helpers |
| `src/app/globals.css` | Tailwind import; the `@theme` palette tokens of §8 |
| `src/components/home-shell.tsx` | Presentational shell shared by the four role homes (card, serif greeting, notice banner — §8); contains no checks of its own |
| `src/app/layout.tsx` | Root layout; Tailwind import; renders the shared header only when a session exists |
| `src/app/page.tsx` | `/` — the redirect of rule 7 |
| `src/app/login/page.tsx` | The `/login` form |
| `src/app/(home)/employee/page.tsx` | `/employee` — calls `requireUser([EMPLOYEE])` first |
| `src/app/(home)/supervisor/page.tsx` | `/supervisor` — calls `requireUser([SUPERVISOR])` first |
| `src/app/(home)/hr/page.tsx` | `/hr` — calls `requireUser([HR])` first |
| `src/app/(home)/admin/page.tsx` | `/admin` — calls `requireUser([ADMIN])` first |
| `.env.example` | `SESSION_SECRET=change-me` placeholder (real `.env` is git-ignored) |

No API routes, no auth library, no middleware that pretends to be a security
check — `requireUser` in each page/action is the check (rule 6).

## 6. Security (in plain words)

- **Every page** calls `requireUser` before rendering; **every server action** (login, logout, anything later) re-checks the signed cookie and the role itself — hiding buttons is never the protection (OWASP A01).
- Passwords exist hashed only (bcrypt, rule 4); they never appear in the cookie, in URLs, in logs, or in error messages (A02, A09).
- Login failure says nothing about which half was wrong (rule 2), and the 15-minute lockout stops guessing (rule 3, A07).
- The cookie is signed and short-lived (rule 5): tampering fails the signature, expiry ends the session, `httpOnly` keeps it away from scripts, `sameSite=lax` blunts cross-site form tricks (A05, A07).
- `SESSION_SECRET` lives in `.env`, which is git-ignored; the app fails fast if it is missing, so nobody ships a default key (A02/A05).
- All database access is Prisma parameterised — no string-built SQL (A03); the login form accepts only email + password and the server re-validates both (A03, A08).
- The role list and route map are constants in code, never read from the browser or the cookie alone — the cookie's role is only a claim, checked against the database at login time (A01).

## 7. Commands

| Command | What it does |
|---------|--------------|
| `npm install` | Install pinned dependencies |
| `npx prisma db push` | Create/update the SQLite file from `schema.prisma` |
| `npm run db:seed` | Load the six demo accounts (AC-08, AC-09 run against this) |
| `npx prisma studio` | Open the database in the browser — how to check AC-08/AC-09 by hand |
| `npm run dev` | Start the app at http://localhost:3000 |

## 8. Look and feel

Agreed 20/11/2026: the screens follow the attached reference
(`image/login design.jpg` — a cream/purple/coral marketing login) for
**layout, colours and spacing only**. No behaviour changes: the same server
actions, form fields, message strings (Reference A) and access rules of §4
still apply. The reference's artwork (Vanta's llama) is **not** shipped;
the right-hand panel is recreated as pure-CSS coral blobs, and no external
images are used.

**Palette** (Tailwind v4 `@theme` tokens in `src/app/globals.css`):

| Token | Hex | Used for |
|-------|-----|----------|
| `cream` | `#F6F1EA` | page background, header background |
| `ink` | `#1D1145` | headings, body text, wordmark |
| `brand` | `#6C3FE0` (hover `#5730C0`) | primary submit button |
| `coral` | `#E8604C` (light `#F07B68`) | decorative blobs on `/login` |
| `muted` | `#6B6580` | secondary text (emails, placeholder lines) |
| `line` | `#E5E0D8` | hairline borders (cards, header) |
| `field` | `#D8D2E4` | form input borders |

**Typography:** headings use the system serif stack (Tailwind `font-serif`),
large and tight — mirroring the reference's serif "Welcome back!"; body and
form text stay sans-serif, small (`text-sm`/`text-xs`).

**Login screen (`/login`):** full-height two-column split.
- Left (≈55%): wordmark "Budiman HRMS" top-left in `ink`; below it the serif
  heading "Welcome back!" (`text-4xl`/`text-5xl`), and under that a white
  card (`max-w-sm`, `rounded-xl`, hairline `line` border, soft shadow, `p-6`)
  titled "Sign into Budiman HRMS" with the quiet note from §4, the message
  banners, the Email + Password fields (small labels, `rounded-md` inputs,
  `field` border, purple focus ring) and one full-width purple button
  labelled "Log in".
- Right (≈45%, `md:` and up only): `aria-hidden` coral blobs — organic
  `border-radius` shapes bleeding off the edge, echoing the reference's
  scalloped panel. Decorative only, no images, no text.
- On small screens the right panel disappears and the card centres on cream.

**Home screens (four role homes):** same cream page; the greeting "Hello,
{name}." becomes a serif `ink` heading inside a centred white card
(`max-w-2xl`, `rounded-xl`, `p-8`), the placeholder line in `muted` below it.
The forbidden notice sits above the card (soft coral banner, exact Reference A
wording). The shared header matches: cream background, hairline bottom
border, `ink` wordmark + `muted` name/email, "Log out" as a quiet
outline button. Implemented by the shared presentational component
`src/components/home-shell.tsx` — pages keep their own `requireUser` and
database checks.

**Spacing rhythm:** generous — outer padding `px-8`/`px-10`, card padding
`p-6`/`p-8`, form fields stacked with `gap-4`, corner radius `rounded-xl`
for cards and `rounded-md` for inputs and buttons.

---

# Reference

## Reference A. Fixed lists

- **Roles → home route:** `Employee` → `/employee`, `Supervisor` → `/supervisor`, `HR` → `/hr`, `Admin` → `/admin`
- **Divisions → designations:**
  - Finance: Finance Manager, Accountant, Accounts Clerk
  - Human Resources: HR Manager, HR Officer, HR Assistant
  - Information Technology: IT Manager, Software Developer, IT Support Officer
  - Operations: Operations Manager, Operations Supervisor, Operations Executive
  - Marketing: Marketing Manager, Marketing Executive, Marketing Assistant
  - Admin (Admin user only): Admin Manager
- **Message strings** (the exact words tests check against):
  - Wrong format: `Use your @budiman.com work email`
  - Wrong credentials: `Invalid email or password`
  - Locked: `Too many failed attempts. Try again in 15 minutes.`
  - Cross-role: `You are not allowed to view that page`
  - Logged out: `You have been logged out`

## Reference B. Demo data (seeded by `prisma/seed.ts`)

| Email | Name | IC No. | Role | Division | Designation |
|-------|------|--------|------|----------|-------------|
| `employee-1@budiman.com` | Employee 1 | 00-148888 | Employee | Finance | Accounts Clerk |
| `supervisor-1@budiman.com` | Supervisor 1 | 00-157777 | Supervisor | Finance | Finance Manager |
| `supervisor-2@budiman.com` | Supervisor 2 | 00-166666 | Supervisor | Finance | Accountant |
| `hr-1@budiman.com` | HR 1 | 00-175555 | HR | Human Resources | HR Officer |
| `hr-2@budiman.com` | HR 2 | 00-184444 | HR | Human Resources | HR Officer |
| `admin@budiman.com` | Admin | 00-193333 | Admin | Admin | Admin Manager |

All six log in with `password123` (stored only as a bcrypt hash). The
employee and both supervisors are in Finance so either supervisor is a valid
choice once the leave form arrives.

---

# Leave Request — Flow – Design

> **This section answers:** How is the leave flow put together? (data,
> statuses, rules, screens, who can do what, where the code lives)
> **Who:** The AI drafted it from `01-requirements.md` §6–§10 and document
> sections 5–7. You review all of it.
>
> The status values and message strings here are contracts: the same words
> appear in requirements §9, in `03-tasks.md`, and in the code. If they
> disagree, fix this file first.

## 9. Tables

### `LeaveType` — the pick-list; a fixed seeded list

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `name` | text | yes | Exactly one of the five names in Reference C. Unique |
| `sortOrder` | number | yes | Order on the form's dropdown (1–5) |
| `active` | boolean | yes (default true) | `false` hides it from new forms; existing requests are unaffected |

The Admin does **not** manage this table — document 5.3 rule 6 keeps the
Admin view-only. Rows are created only by the seed. (The interview's
"Admin manages leave types" rested on the mis-summarised document and was
dropped on 20/11/2026.)

### `LeaveRequest` — one row per request

| Field | Type | Required? | What it holds |
|-------|------|-----------|---------------|
| `id` | number | auto | Unique number for the row |
| `employeeId` | number → `User.id` | yes | Who is asking (an Employee, or a Supervisor asking for themselves) |
| `supervisorId` | number → `User.id` | yes\* | The supervisor who must sign. \*`null` only when a Supervisor asks for themselves (rule 4) |
| `leaveTypeId` | number → `LeaveType.id` | yes | One of the five seeded types |
| `otherLeaveType` | text | when type is **Other** | What the leave is for (document 7.2) |
| `reason` | text | when type is **Compassionate leave**; else optional | The employee's stated reason (≤ 500 characters, trimmed) |
| `startDate` / `endDate` | date | yes | First and last day; `endDate ≥ startDate`; past dates allowed |
| `halfDay` | text | no | `null` (= full days), `Morning` or `Afternoon`; only legal when `startDate = endDate` |
| `status` | text | yes | One of the seven values in §10 |
| `supervisorRemark` | text | when **Rejected by supervisor** | The supervisor's reason |
| `hrOfficerId` | number → `User.id` | when **Approved** / **Rejected by HR** | The HR officer who decided — set automatically |
| `hrRemark` | text | when **Rejected by HR** | HR's reason |
| `submittedAt` | date | auto | Set by the database on creation |
| `signedAt` | date | no | When the supervisor signed |
| `decidedAt` | date | no | When HR decided |
| `cancelledAt` | date | no | When the employee cancelled or withdrew |

**The days count is never stored.** It is computed from start/end/halfDay by
`src/lib/leave/days.ts` (rule 7) wherever it is shown — a stored number
drifts the moment dates are edited.

### One addition to `User` (declared by this module; §1 stays as written)

| Field | Type | What it holds |
|-------|------|---------------|
| `annualLeaveEntitlement` | number, default 14 | Annual leave days allowed per calendar year (rule 10). Seeded to 14 for everyone; per-employee changes wait for the U9 Admin screen's own spec |

## 10. Statuses (document 5.2, plus Cancelled)

| Status | Meaning | Who may act | Moves to |
|--------|---------|-------------|----------|
| `Pending supervisor` | Submitted, waiting for the chosen supervisor | That supervisor; the employee | Sign → `Signed` · reject (remark) → `Rejected by supervisor` · cancel → `Cancelled` |
| `Signed` | Supervisor signed; waiting for the employee to forward it | The employee | Send to HR → `Pending HR` · cancel → `Cancelled` |
| `Pending HR` | In the shared HR queue | Either HR officer; the employee | Approve → `Approved` · reject (remark) → `Rejected by HR` · cancel → `Cancelled` |
| `Approved` | Final decision | The employee | Withdraw (only if start date is still in the future) → `Cancelled` |
| `Rejected by supervisor` | Rejected with a reason | The employee | Edit & resubmit → `Pending supervisor` |
| `Rejected by HR` | Rejected with a reason | The employee | Edit & resubmit → `Pending supervisor` (the whole flow runs again — document 5.3 rule 4) |
| `Cancelled` | Withdrawn by the employee | Nobody | Final |

A row starts at `Pending supervisor`, except a Supervisor's own request,
which starts at `Pending HR` with `supervisorId` null (rule 4). Only the
moves in this table are legal, and the server action re-reads the row's
status at the moment of the action and refuses anything else ("This request
can no longer be changed") — two people clicking at once cannot both win.

## 11. Business rules

1. **Every page and every action checks the session first** (`requireUser`, login rule 6), then its own role and ownership check. A hidden button is never the protection.
2. **Only Employees submit** (document 5.3 rule 2); Supervisors submit only for themselves (see rule 4 below — a documented deviation, see L8); HR and Admin never submit. Supervisors and HR only decide.
3. **An Employee's supervisor must be a Supervisor in the same division** — checked against the database on submit and on edit, not just in the dropdown; otherwise "Pick a supervisor from your own division".
4. **A Supervisor's own request** has `supervisorId = null` and starts at `Pending HR`; nobody signs their own request (L8).
5. **Every action is one legal move from §10.** The action re-reads the row and checks its status at that moment; status and record ids never come from the form ("This request can no longer be changed").
6. **Rejections always carry a remark** — `supervisorRemark` for a supervisor rejection, `hrRemark` for an HR rejection ("A remark is required when rejecting"). An HR decision sets `hrOfficerId` to the acting officer and `decidedAt`; either HR officer may decide any `Pending HR` row (document 5.3 rule 5).
7. **Days are working days.** Mon–Fri only, start and end inclusive; `halfDay` is only legal when start = end and counts 0.5, otherwise 1 per working day. Computed by `src/lib/leave/days.ts`, never stored (rule 10's balance uses it too).
8. **Dates:** only `endDate ≥ startDate` is validated; past dates are accepted (retroactive reporting), and the supervisor judges them.
9. **Type-conditional fields:** type **Other** requires `otherLeaveType` ("Say what this leave is for"); type **Compassionate leave** requires `reason` ("Write a reason for compassionate leave"). Both are trimmed free text, rendered as plain text.
10. **Annual balance:** days used = the employee's own rows this calendar year (by `startDate`) with type Annual leave and status in (`Pending supervisor`, `Signed`, `Pending HR`, `Approved`). A submit or edit is blocked when used + requested exceeds `annualLeaveEntitlement` ("Not enough Annual leave days left"). The other four types are uncapped. The balance is read and the row written inside one server action. Cancelled and Rejected rows free their days.
11. **Cancel/withdraw (employee, own rows only):** allowed from `Pending supervisor`, `Signed` and `Pending HR`; from `Approved` only while `startDate` is still in the future. Sets `Cancelled` + `cancelledAt`.
12. **Edit:** only own rows in `Pending supervisor` (type, supervisor, dates, half-day, reason). A `Rejected by supervisor` or `Rejected by HR` row may be **Edit & resubmit** — the same edit, and the status returns to `Pending supervisor`. `Signed`, `Pending HR`, `Approved`, `Cancelled` are never editable.
13. **Ownership on every action:** the action loads the row and checks the actor against §13 — Employee acts on own rows only; a Supervisor signs/rejects only rows routed to them; HR decides only `Pending HR` rows; Admin has no write actions at all. A forged id from DevTools is refused exactly like a smuggled button, with "You cannot act on that request".
14. **Input is never trusted:** server-side validation of every field; ids are checked against the database; whitelists for `status`/`halfDay`; Prisma parameterised queries only; React renders remarks/reasons as escaped text.
15. **Emails (L13, Low extra):** recipients come only from user rows in the database, never from the form. With `SMTP_HOST` etc. in `.env` nodemailer sends; without them the mail is logged as `[email] to <address>: <subject>` on the dev console. Mail failure never blocks or reverses the action, and mail content never contains passwords or secrets.

## 12. Screens (the four homes gain their real content; no new routes)

| Route | Who | What the flow adds |
|-------|-----|--------------------|
| `/employee` | Employee | Own-requests table (type, dates, computed days, status, remarks) + **New request** form (type dropdown from Reference C; `otherLeaveType`/`reason` appear when the type needs them; date fields; Morning/Afternoon half-day option; supervisor dropdown filtered to own division) + per-row actions from §10 (edit, cancel, withdraw, resubmit, send to HR) |
| `/supervisor` | Supervisor | Queue: rows routed to them at `Pending supervisor` first, then current and past; **Sign** and **Reject (remark)** on queue rows only |
| `/hr` | HR | Queue: all `Pending HR` rows first, then the full history with the deciding officer shown; **Approve** and **Reject (remark)** on queue rows |
| `/admin` | Admin | Every row from every division, filterable by status, type and division; status and remarks visible; **no action buttons at all** |

Every action pops a confirmation first and lands with a success banner
(FR-07; strings in Reference E). Buttons are rendered only when §10 allows
the move — and the server action checks again regardless (rule 13).

## 13. Who can do what

| Action | Employee | Supervisor | HR | Admin |
|--------|----------|------------|----|-------|
| Submit a request | ✔ own | ✔ own (goes to `Pending HR`) | ✘ | ✘ |
| Sign / reject a routed row | ✘ | ✔ only rows naming them | ✘ | ✘ |
| Approve / reject from the HR queue | ✘ | ✘ | ✔ any `Pending HR` row | ✘ |
| Send their `Signed` row to HR | ✔ own | ✔ own | ✘ | ✘ |
| Edit / cancel / withdraw / resubmit | ✔ own rows only | ✔ own rows only | ✘ | ✘ |
| See lists | ✔ own rows | ✔ rows routed to them | ✔ queue + all history | ✔ everything, view only |

## 14. Where the code lives (flow additions)

| Folder / file | What's in it |
|---------------|--------------|
| `prisma/schema.prisma` | Adds `LeaveType` and `LeaveRequest` exactly as §9, and `User.annualLeaveEntitlement` |
| `prisma/seed.ts` | Upserts the five Reference C types (idempotent, like the user seed) and the entitlement default |
| `src/lib/leave/status.ts` | The seven status constants and §10's transition table — the only source for "may this move happen", used by actions and buttons alike |
| `src/lib/leave/days.ts` | Working-day and half-day counting (rule 7) — pure functions, testable by hand |
| `src/lib/leave/balance.ts` | Annual days used / remaining for one employee and year (rule 10) — pure functions |
| `src/lib/leave/validate.ts` | Server-side form validation: dates, half-day, type-conditional fields, supervisor division (rules 3, 8, 9) |
| `src/lib/leave/requests.ts` | Server actions: `submitRequest`, `editRequest`, `resubmitRequest`, `cancelRequest`, `sendToHr`, `signRequest`, `rejectBySupervisor`, `approveRequest`, `rejectByHr` — each starts with `requireUser` and the rule 13 ownership check |
| `src/lib/notify.ts` | The email step of rule 15 (nodemailer or dev-console log) |
| `src/components/leave-form.tsx` | New/edit form with the type-conditional fields |
| `src/components/leave-table.tsx` | Shared requests table (columns, status pill, remarks as plain text) |
| `src/components/request-actions.tsx` | Per-row buttons, rendered only when §10 allows, each behind `confirm()` |
| `src/app/(home)/employee/page.tsx` | Own list + form + own-row actions |
| `src/app/(home)/supervisor/page.tsx` | Queue + sign/reject |
| `src/app/(home)/hr/page.tsx` | Queue + approve/reject |
| `src/app/(home)/admin/page.tsx` | Filters + view-only table |
| `.env.example` | Adds optional `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (all optional; absence = dev-log mode) |

## 15. Security (flow additions)

- **IDOR (OWASP A01):** every action re-loads the row and enforces §13 ownership and the §10 stage — the cookie's role and the form's ids are claims, never facts.
- **Server-side state machine:** `status` is not an input; transitions are checked against §10 at the moment of the action, so stale screens and forged posts both fail.
- **Whitelists and database checks:** types must exist and be `active`; the supervisor must be a Supervisor in the same division; `halfDay` is one of `null/Morning/Afternoon`; all reads/writes are Prisma parameterised (A03).
- **Balance is not a suggestion:** the check of rule 10 happens in the same action that writes, so the UI cannot be talked past it.
- **Emails (A01/A08):** recipients only from the database; mail never affects the transaction's outcome; no secrets in content.
- **No file uploads anywhere** — the dropped certificate removes the OWASP file-upload risk entirely.
- Remarks and reasons render as escaped plain text (A05 XSS surface kept shut).

## 16. Commands

Unchanged from §7 — `npx prisma db push` picks up the new tables and
`npm run db:seed` now also loads the leave types (no new commands).

## 17. Look and feel (flow)

Reuses §8's palette and rhythm. Requests tables sit in the same white cards
as the home screens; column headers in `muted`, rows separated by `line`
hairlines. Status pills: `Pending supervisor` / `Signed` / `Pending HR` —
`brand` outline on cream; `Approved` — solid `brand`; `Rejected by
supervisor` / `Rejected by HR` — `coral`; `Cancelled` — `muted` outline. The
request form reuses the login card's field style (`field` borders, purple
focus ring); the half-day choice is two radio buttons beside the date
fields. Confirmation is the browser's native dialog — the agreed simple
option.

---

## Reference C. Leave types (seeded by `prisma/seed.ts`, fixed list)

| Order | Name | Special rules |
|-------|------|---------------|
| 1 | Annual leave | The only balance-capped type (rule 10) |
| 2 | Maternity leave | — |
| 3 | Unpaid leave | — |
| 4 | Compassionate leave | `reason` required ("For a family emergency or bereavement" — the employee must write what it is for) |
| 5 | Other | `otherLeaveType` required |

## Reference D. Demo leave data

No leave rows are seeded — acceptance tests create their own requests, so
every machine starts from the same empty state. `annualLeaveEntitlement` is
14 for all six accounts (only the Employee and Supervisors ever use it).

## Reference E. Flow message strings (the exact words tests check against)

- Success: `Request submitted` · `Request signed` · `Request sent to HR` · `Request approved` · `Request rejected` · `Request cancelled` · `Request updated`
- Which success string when: Submit → `Request submitted` · Sign → `Request signed` · Send to HR → `Request sent to HR` · Approve → `Request approved` · Reject (either role) → `Request rejected` · Cancel and Withdraw → `Request cancelled` · Edit and Resubmit → `Request updated`
- Validation errors: `Pick a supervisor from your own division` · `End date must be on or after start date` · `A remark is required when rejecting` · `Say what this leave is for` · `Write a reason for compassionate leave` · `Not enough Annual leave days left`
- Refusals: `This request can no longer be changed` (wrong stage — rule 5) · `You cannot act on that request` (not your row, or any action by the Admin — rule 13)
