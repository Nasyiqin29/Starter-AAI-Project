# Project Rules — Budiman HRMS (Leave Request module)

## What this is
A web app replacing Budiman Company's paper leave forms. Four roles — Employee,
Supervisor, HR, Admin — move each request from submission to decision. Build only
what `docs/Agentic AI - HRMS Doc.pdf` asks for (section 6); extras are out of scope.

## Built with (fixed — add no other frameworks, ORMs or auth libraries)
Next.js + TypeScript, SQLite with Prisma, Tailwind CSS, server actions (no separate
API), login by signed session cookie, passwords hashed with bcryptjs.

## How to run
`npm install`, then `npm run dev` → http://localhost:3000. Needs Node 20.9+.

## Where things live
- `docs/Agentic AI - HRMS Doc.pdf` — the requirements document (data fields: 7.2)
- `docs/templates/` — blank spec templates; copy into `docs/specs/`, never overwrite
- `docs/specs/` — the agreed specs: `01-requirements.md`, `02-design.md`, `03-tasks.md`
- `src/app/` — the whole app: screens and server logic

## How to work
- Spec-Driven Development: agree the spec first, build from it, check the result
  against it. Something wrong? Fix the spec in `docs/specs/` before the code.
- Build one task at a time from `03-tasks.md`, High priority first; login comes first.
- Security in every task (OWASP Top 10, document section 7.5): check the role on every
  page and action, hash passwords, never trust input from the browser.
- Ask permission before running anything that changes state.

## Commits
Every commit message uses Conventional Commits: `feat: add login page`,
`fix: check leave dates`, `docs: add design spec`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
