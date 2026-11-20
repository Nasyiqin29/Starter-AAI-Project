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
| To do | AC-01 | Every role logs in and lands on its own home page | • Go to `http://localhost:3000` — you should see `/login`<br>• Log in as `employee-1@budiman.com` / `password123` → land on `/employee`<br>• Log out; repeat with `supervisor-1@budiman.com`, `hr-1@budiman.com`, `admin@budiman.com`<br>Each should land on `/supervisor`, `/hr`, `/admin` respectively |
| To do | AC-02 | Only well-formed work emails are accepted | • On `/login`, enter `employee-1@gmail.com` / `password123`<br>• You should see "Use your @budiman.com work email" and stay on `/login`<br>• Repeat with `not-an-email` / `password123` → same message |
| To do | AC-03 | Wrong email and wrong password give one identical, generic message | • Log in as `employee-1@budiman.com` / `wrongpass` → note the message ("Invalid email or password")<br>• Log in as `nobody@budiman.com` / `password123` → the message must be word-for-word the same |
| To do | AC-04 | Five failed logins lock that email for 15 minutes | • Fail 5 logins in a row as `employee-1@budiman.com` (wrong password)<br>• 6th attempt, even with the correct `password123` → a message says the account is temporarily blocked<br>• Wait 15 minutes → correct login now succeeds |
| To do | AC-05 | The session cookie is signed, limited to 8 hours, and unreadable by scripts | • Log in as `employee-1@budiman.com`<br>• Open browser DevTools → Application → Cookies → `http://localhost:3000`<br>• The session cookie has `HttpOnly` and `SameSite=Lax` set, path `/`, and its value is not a plain user id<br>• The cookie's expiry is about 8 hours ahead (or the server rejects the cookie after 8 hours) |
| To do | AC-06 | Pages are closed to strangers and to other roles | • Without logging in, open `http://localhost:3000/hr` directly → you are redirected to `/login`<br>• Log in as `employee-1@budiman.com`, then type `/hr` in the address bar → you are back on `/employee` with a "You are not allowed to view that page" notice<br>• Repeat the cross-role test with one page per role pair you can reach |
| To do | AC-07 | Logging out ends the session from any screen | • Log in as `hr-1@budiman.com` and open any page<br>• Click "Log out" in the header → you land on `/login` with "You have been logged out"<br>• Press the browser Back button → protected pages are not shown; you are sent to `/login` |
| To do | AC-08 | Passwords are stored hashed, never as plain text | • Run `npm run db:seed` (or the seed step agreed in the design spec)<br>• Open the SQLite database and look at the Users table<br>• Each password value starts with `$2a$` (a bcrypt hash) and nowhere equals `password123` |
| To do | AC-09 | Only six demo accounts exist at seed, with the right roles and divisions | • After seeding, count users in the database: 6<br>• Check `supervisor-2@budiman.com` is Supervisor, Finance, Accountant and `hr-2@budiman.com` is HR, Human Resources, HR Officer (document 7.2 table)<br>• Log in as `supervisor-2@budiman.com` / `password123` → lands on `/supervisor` |
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
