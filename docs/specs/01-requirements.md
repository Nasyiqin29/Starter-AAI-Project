# Leave Request — Login – Requirements

> **This file answers:** What should the app do, and why?
> **Who:** The AI drafted it from the interview (20/11/2026). You review it.
>
> When the app's behaviour needs to change, update this file **first**.
> Later modules (leave request flow, HR queue, admin view) add their stories
> below the existing ones — they do not replace this file.

## 1. The problem

Budiman Company is replacing paper leave forms with a web system, but only
staff of Budiman may use it, and each of the four roles must see only their
own part of the process. Without a login, anyone on the network could open
requests, sign them, or approve them, and the audit trail ("who decided")
becomes worthless.

This module provides:

1. A login open only to staff accounts, checked by work email and password
2. One role-appropriate home page per role, so each person starts where their work is
3. A hard boundary between roles — no role can open another role's pages
4. A clean way to end a session (log out) on the shared developer laptops
5. Demo accounts pre-loaded with hashed passwords, so everyone tests the same way

## 2. Who uses it (roles)

| Role | Home page | What they do |
|------|-----------|--------------|
| **Employee** | `/employee` | After login, lands on their own requests page (submit/track is a later module) |
| **Supervisor** | `/supervisor` | After login, lands on their requests-to-sign page (decide is a later module) |
| **HR** | `/hr` | After login, lands on the shared HR queue (decide is a later module) |
| **Admin** | `/admin` | After login, lands on the all-records view (view only, later module); manages user accounts |

Everyone who is not logged in starts at `/login`.

## 3. User stories

- **U1. Log in** *(High)*. As a Budiman staff member, I can log in with my `@budiman.com` work email and my password so that only staff can use the system.
- **U2. Role home page** *(High)*. As a member of any role, I land on my own role's home page after login so that I immediately see the work that belongs to me.
- **U3. Role boundary** *(High)*. As a staff member, I am bounced back to my own home with a notice if I open another role's page, so that no role can reach pages that are not theirs.
- **U4. Stay signed in for a working day** *(High)*. As a staff member, my login lasts 8 hours so that I am not asked for my password mid-day, and it ends by itself overnight.
- **U5. Log out** *(High)*. As a staff member on a shared laptop, I can log out from any screen so that the next person cannot open my pages.
- **U6. Safe failure messages** *(High)*. As the company, failed logins always show one generic message, so that nobody can discover which emails have accounts.
- **U7. Guessing is blocked** *(High)*. As the company, an email that fails 5 logins in a row is blocked for 15 minutes, so that guessing passwords does not work.
- **U8. Same demo accounts for everyone** *(High)*. As a developer or tester, the six demo people from the document are pre-loaded with hashed passwords, so every machine starts with the same logins.
- **U9. Admin manages users** *(Low)*. As an Admin, I can add and edit user accounts so that staff beyond the six demo people can log in without touching code. *(Extra scope beyond document section 6 — specification to be written before it is built, and it does not change the Admin's view-only rule for leave records.)*

## 4. Acceptance checklist

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| Done | AC-01 | Every role logs in and lands on its own home page | • Go to `http://localhost:3000` — you should see `/login`<br>• Log in as `employee-1@budiman.com` / `password123` → land on `/employee`<br>• Log out; repeat with `supervisor-1@budiman.com`, `hr-1@budiman.com`, `admin@budiman.com`<br>Each should land on `/supervisor`, `/hr`, `/admin` respectively |
| Done | AC-02 | Only well-formed work emails are accepted | • On `/login`, enter `employee-1@gmail.com` / `password123`<br>• You should see "Use your @budiman.com work email" and stay on `/login`<br>• Repeat with `not-an-email` / `password123` → same message |
| Done | AC-03 | Wrong email and wrong password give one identical, generic message | • Log in as `employee-1@budiman.com` / `wrongpass` → note the message ("Invalid email or password")<br>• Log in as `nobody@budiman.com` / `password123` → the message must be word-for-word the same |
| Done | AC-04 | Five failed logins lock that email for 15 minutes | • Fail 5 logins in a row as `employee-1@budiman.com` (wrong password)<br>• 6th attempt, even with the correct `password123` → a message says the account is temporarily blocked<br>• Wait 15 minutes → correct login now succeeds |
| Done | AC-05 | The session cookie is signed, limited to 8 hours, and unreadable by scripts | • Log in as `employee-1@budiman.com`<br>• Open browser DevTools → Application → Cookies → `http://localhost:3000`<br>• The session cookie has `HttpOnly` and `SameSite=Lax` set, path `/`, and its value is not a plain user id<br>• The cookie's expiry is about 8 hours ahead (or the server rejects the cookie after 8 hours) |
| Done | AC-06 | Pages are closed to strangers and to other roles | • Without logging in, open `http://localhost:3000/hr` directly → you are redirected to `/login`<br>• Log in as `employee-1@budiman.com`, then type `/hr` in the address bar → you are back on `/employee` with a "You are not allowed to view that page" notice<br>• Repeat the cross-role test with one page per role pair you can reach |
| Done | AC-07 | Logging out ends the session from any screen | • Log in as `hr-1@budiman.com` and open any page<br>• Click "Log out" in the header → you land on `/login` with "You have been logged out"<br>• Press the browser Back button → protected pages are not shown; you are sent to `/login` |
| Done | AC-08 | Passwords are stored hashed, never as plain text | • Run `npm run db:seed` (or the seed step agreed in the design spec)<br>• Open the SQLite database and look at the Users table<br>• Each password value starts with `$2a$` or `$2b$` (a bcrypt hash — bcryptjs 3.x produces `$2b$`) and nowhere equals `password123` |
| Done | AC-09 | Only six demo accounts exist at seed, with the right roles and divisions | • After seeding, count users in the database: 6<br>• Check `supervisor-2@budiman.com` is Supervisor, Finance, Accountant and `hr-2@budiman.com` is HR, Human Resources, HR Officer (document 7.2 table)<br>• Log in as `supervisor-2@budiman.com` / `password123` → lands on `/supervisor` |
| To do | AC-10 | *(Low, spec first)* Admin can add and edit users; no other role can open that screen | • Log in as `admin@budiman.com` → open the user management screen, add `test-1@budiman.com` with role Employee, a Finance division designation, and a password<br>• Log out; log in as `test-1@budiman.com` → lands on `/employee`<br>• Log in as `employee-1@budiman.com` and try to open the user management URL → bounced to `/employee` with the notice |

## 5. Not included (for now)

- Password reset, "forgot password", or email verification — demo passwords are known and shared by design (document 7.2)
- Self sign-up / registration page — accounts come from the seed script (and, later, the Admin screen)
- "Remember me" option — sessions are fixed at 8 hours
- Server-side session store or instant revocation (blocklist) — a signed cookie with an 8-hour expiry is enough for this system
- Two-factor authentication
- Changing one's own password (a later module, if ever requested)
- Anything about leave requests themselves — submission, signing, HR decisions and the admin view are the next spec files, not this one
- Styling beyond plain Tailwind defaults

---

# Leave Request — Flow – Requirements

> **This section answers:** What must the leave request flow do, and why?
> **Who:** The AI drafted it from `docs/Agentic AI - HRMS Doc.pdf` sections 4–6
> and 7.2 plus the flow interview (20/11/2026). You review it.
>
> The document wins wherever it speaks (five leave types, the two-stage
> supervisor→HR flow); the interview fills its gaps (day counting, half-days,
> cancellation, editing, balances, notifications). Items marked *(Extra)* go
> beyond section 6 and follow FR-09: this spec first, and never above the
> priority of what the document itself asks (Medium or Low in tasks).
>
> Correction recorded 20/11/2026: the first interview round was based on a
> mis-summarised document (four types, single-stage approval, certificates).
> The document is authoritative: types are the five in Reference C, the flow
> is two-stage, and there is no doctor's certificate anywhere in this module.

## 6. The problem

Budiman still processes leave on paper: the employee fills a form, the
supervisor signs it, and HR copies it into a spreadsheet by hand. Forms get
lost or delayed, employees cannot see where their request is, and HR has no
single list of requests waiting for a decision (document §2). This module
replaces the whole paper chain, from submission to decision, inside the app
login already protects.

This module provides:

1. A submission form — leave type, start/end dates, half-day if needed,
   reason, and a supervisor chosen from the employee's own division (FR-02)
2. A supervisor queue — sign or reject what is sent to you; a rejection needs
   a remark (FR-03)
3. A send-to-HR step — after signing, the employee moves their own request
   into the shared HR queue (FR-04)
4. An HR queue — either HR officer approves or rejects; a rejection needs a
   remark; the officer who decides is recorded (FR-05)
5. Current and past lists for every role, with status and remarks (FR-06)
6. Confirmation before every action and a success message after it (FR-07)
7. A view-only list of every record for the Admin (FR-08)

## 7. Who uses it (roles)

| Role | In the flow |
|------|-------------|
| **Employee** | Submits their own requests, tracks them, sends Signed ones to HR, cancels/withdraws, edits Pending ones, resubmits Rejected ones |
| **Supervisor** | Signs or rejects requests routed to them — never their own; their own requests go to the HR queue instead (L8) |
| **HR** | Approves or rejects from the Pending HR queue — either officer may decide, and the decider is recorded. HR staff do not hold leave requests themselves (document 5.3 rule 2) |
| **Admin** | Sees every request, changes nothing (document 5.3 rule 6) |

## 8. User stories

- **L1. Submit a request** *(High — FR-02)*. As an Employee, I submit a leave request — type, start and end dates, half-day if needed, a reason — and choose a supervisor **from my own division**, so it lands with someone who actually oversees me.
- **L2. Sign or reject** *(High — FR-03)*. As a Supervisor, I sign or reject requests sent to me; a rejection requires a remark so the employee can see why.
- **L3. Send to HR** *(High — FR-04)*. As an Employee, once my request is Signed I send it to the shared HR queue myself — the same as handing the signed paper form to HR.
- **L4. HR decision** *(High — FR-05)*. As an HR officer, I approve or reject requests in the HR queue; a rejection requires a remark; the system records which officer decided, so the audit trail is real.
- **L5. See status and remarks** *(High — FR-06)*. As any role, I see the current and past requests that concern me, with their status and remarks, so nothing gets lost and nobody has to ask.
- **L6. Confirm, then know it worked** *(High — FR-07)*. As any role, every action that decides or changes something asks for confirmation first and shows a clear success message after, so a mis-click cannot decide a request and I always know what happened.
- **L7. Admin view-only** *(Medium — FR-08)*. As the Admin, I see every leave record with its status and remarks — and I change nothing.
- **L8. Supervisor's own leave** *(Medium — Extra; a documented deviation from document 5.3 rules 2 and 4, which say only Employees apply and every request sees a supervisor first — a supervisor has no supervisor, so HR decides instead)*. As a Supervisor, my own request goes straight to the HR queue for HR to decide — no one signs their own request.
- **L9. Cancel and withdraw** *(Medium — Extra)*. As an Employee, I cancel a request while nobody has decided it, and withdraw an Approved one before its start date, so mistakes can be undone.
- **L10. Edit and resubmit** *(Medium — Extra)*. As an Employee, I edit a request before it is signed, and fix-and-resubmit a rejected one (back to my supervisor), so a small mistake is not a dead end.
- **L11. Days count as working days** *(Medium — Extra)*. As an Employee, weekends never count against me: Friday–Monday is 2 days, not 4, and a morning or afternoon half-day counts as 0.5.
- **L12. Annual leave balance** *(Low — Extra, FR-09)*. As the company, Annual leave requests that would exceed the employee's remaining entitlement this year (14 days by default) are blocked; the other four types are uncapped.
- **L13. Email notifications** *(Low — Extra, FR-09)*. As a Supervisor or Employee, I also get an email when a request lands in my queue or a decision is made on mine — logged to the dev console until Budiman provides SMTP settings.

## 9. Acceptance checklist (flow)

| Status | ID | Check | How to test |
|--------|----|-------|-------------|
| Done | AC-11 | A submitted request appears Pending supervisor for both sides | • Log in as `employee-1@budiman.com` / `password123` → `/employee`<br>• New request: type **Annual leave**, start = next Monday, end = next Tuesday, reason "family event", supervisor **Supervisor 1** → confirm → success message<br>• Your list shows it as **Pending supervisor**; log out, log in as `supervisor-1@budiman.com` → the same row is in their queue |
| Done | AC-12 | Only same-division supervisors can be chosen, and the server checks too | • As employee-1 (Finance), the supervisor dropdown lists Supervisor 1 and Supervisor 2 only<br>• From DevTools, replay the submit action with a forged `supervisorId` (hr-1's id) → "Pick a supervisor from your own division" and no row is created |
| Done | AC-13 | Signing sets Signed and offers the employee "Send to HR" | • As `supervisor-1@budiman.com`, **Sign** the row → confirm → success message, status **Signed**<br>• Log in as employee-1 → the row now offers **Send to HR** |
| Done | AC-14 | Supervisor rejection needs a remark and the employee sees it | • As supervisor-1, **Reject** a Pending row leaving the remark empty → refused with "A remark is required when rejecting"<br>• Enter "team blackout that week", confirm → status **Rejected by supervisor**<br>• employee-1's list shows that remark |
| Done | AC-15 | Send to HR; either officer decides; the decider is recorded | • As employee-1, **Send to HR** → status **Pending HR**<br>• Log in as `hr-2@budiman.com` → **Approve** → confirm → status **Approved**<br>• `npx prisma studio` → the row's `hrOfficerId` is hr-2's id and `decidedAt` is set |
| Done | AC-16 | HR rejection needs a remark | • As `hr-1@budiman.com`, reject a Pending HR row with empty remark → refused<br>• With a remark → **Rejected by HR**; the remark is visible to the employee and to `admin@budiman.com` |
| Done | AC-17 | Each role sees current + past with status and remarks — only its own scope | • employee-1 sees only their rows; supervisor-1 sees only rows routed to them; HR sees the whole queue and past decisions; Admin sees everything<br>• Log in as employee-1, type `/hr` in the address bar → bounced to `/employee` with "You are not allowed to view that page" |
| Done | AC-18 | Every flow action: confirm first, success message after | • Walk all nine changing actions — Submit, Edit, Resubmit, Send to HR, Sign, Reject, Approve, Cancel and Withdraw: each pops a confirmation; dismissing it changes nothing; accepting shows the matching success banner (which string belongs to which action: design Reference E) |
| Done | AC-19 | Nobody can act on someone else's request | • employee-1 submits a row; log in as supervisor-1 and invoke the sign action from DevTools with that row's forged id → refused with "You cannot act on that request" (design rule 13), row unchanged<br>• As hr-1, invoke approve on a **Pending supervisor** row → refused with "This request can no longer be changed" (wrong stage, design rule 5) |
| Done | AC-20 | Cancel (undecided) and withdraw (Approved, before start) | • employee-1 cancels a Pending row → confirm → **Cancelled**<br>• Approve a row starting next month, then **Withdraw** → **Cancelled**<br>• An Approved row starting today cannot be withdrawn; a Cancelled row offers no actions |
| Done | AC-21 | Edit pending; rejected → edit and resubmit | • Edit a **Pending supervisor** row's dates → saved, still Pending supervisor<br>• On a **Rejected by supervisor** row, **Edit & resubmit** with a fixed reason → status back to **Pending supervisor** (same row; original remark still visible) |
| Done | AC-22 | Working-day and half-day counting; date rules | • Request Fri–Mon → shows **2 days**; Sat–Fri → **5 days**; single Wednesday → **1 day**<br>• Half-day (Morning, start = end = a Wednesday) → **0.5 days**<br>• End before start → "End date must be on or after start date"<br>• Dates last week → accepted (retroactive is allowed) |
| Done | AC-23 | A supervisor's own leave skips the supervisor stage | • Log in as `supervisor-1@budiman.com`, submit an Annual request for themselves → status is **Pending HR** directly, no supervisor dropdown is offered<br>• hr-1/hr-2 see it in their queue; supervisor-1 has no sign/approve button for it |
| Done | AC-24 | Admin sees everything and changes nothing | • `admin@budiman.com` → `/admin` lists all rows from every division with status and remarks, and **no action button anywhere**<br>• From DevTools, invoke any leave action while logged in as Admin → refused with "You cannot act on that request" (§13 gives the Admin no write actions) |
| Done | AC-25 | Annual balance blocks over-requesting | • As employee-1 (entitlement 14), submit an Annual request of 14 working days → accepted<br>• Submit one more Annual day → "Not enough Annual leave days left"<br>• Cancel the 14-day row → the one extra day is then accepted<br>• Submit 20 days of Unpaid leave → accepted (uncapped) |
| Done | AC-26 | Emails are logged in dev mode | • With no SMTP settings in `.env`: as employee-1, submit a request → the dev console prints `[email] to supervisor-1@budiman.com: New leave request …`<br>• As hr-2, approve it → the console prints `[email] to employee-1@budiman.com: Request approved …` |

## 10. Not included (flow)

- Doctor's certificate / any file upload — the document never asks for it; dropped from the interview plan. Re-add via FR-09 only if Budiman requests it
- Admin management of leave types — document 5.3 rule 6 keeps the Admin view-only; the five types are a fixed seeded list (design Reference C)
- Leave requests for HR staff — document 5.3 rule 2: only Employees submit (and, per L8, Supervisors for themselves)
- Admin setting the annual entitlement — depends on U9 (Admin user management), whose spec is not yet written; the entitlement is the seeded 14 days for now
- Public-holiday calendars, day carry-over, leave calendars, delegation while a supervisor is away, bulk sign/approve
- Real SMTP delivery — emails log to the dev console until Budiman supplies mail settings (L13)
- Push or in-app unread badges — the queues and lists are the notification
