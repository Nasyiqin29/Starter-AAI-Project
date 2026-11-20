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
