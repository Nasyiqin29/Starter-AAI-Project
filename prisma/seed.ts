// Loads the six demo accounts from docs/specs/02-design.md Reference B.
// Run with `npm run db:seed` (which uses `prisma db seed`, so .env is loaded).
// The demo password is shared by design (HRMS doc 7.2) and lives only here,
// hashed — it must never appear anywhere else in the codebase.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";
const BCRYPT_COST = 10; // design rule 4
const ANNUAL_ENTITLEMENT = 14; // flow design §9/Reference D: 14 days for everyone

// Exactly the fixed list in flow design Reference C. The seed is the only
// writer of this table — the Admin is view-only (document 5.3 rule 6).
const LEAVE_TYPES: { name: string; sortOrder: number }[] = [
  { name: "Annual leave", sortOrder: 1 },
  { name: "Maternity leave", sortOrder: 2 },
  { name: "Unpaid leave", sortOrder: 3 },
  { name: "Compassionate leave", sortOrder: 4 },
  { name: "Other", sortOrder: 5 },
];

type DemoUser = {
  email: string;
  name: string;
  icNumber: string;
  role: string;
  division: string;
  designation: string;
};

// Exactly the table in design Reference B (HRMS doc 7.2).
const DEMO_USERS: DemoUser[] = [
  {
    email: "employee-1@budiman.com",
    name: "Employee 1",
    icNumber: "00-148888",
    role: "Employee",
    division: "Finance",
    designation: "Accounts Clerk",
  },
  {
    email: "supervisor-1@budiman.com",
    name: "Supervisor 1",
    icNumber: "00-157777",
    role: "Supervisor",
    division: "Finance",
    designation: "Finance Manager",
  },
  {
    email: "supervisor-2@budiman.com",
    name: "Supervisor 2",
    icNumber: "00-166666",
    role: "Supervisor",
    division: "Finance",
    designation: "Accountant",
  },
  {
    email: "hr-1@budiman.com",
    name: "HR 1",
    icNumber: "00-175555",
    role: "HR",
    division: "Human Resources",
    designation: "HR Officer",
  },
  {
    email: "hr-2@budiman.com",
    name: "HR 2",
    icNumber: "00-184444",
    role: "HR",
    division: "Human Resources",
    designation: "HR Officer",
  },
  {
    email: "admin@budiman.com",
    name: "Admin",
    icNumber: "00-193333",
    role: "Admin",
    division: "Admin",
    designation: "Admin Manager",
  },
];

async function main() {
  // One hash shared by all six — same password, and hashing is slow (~1s total).
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);

  for (const user of DEMO_USERS) {
    const email = user.email.toLowerCase(); // design rule: lower-case before storing
    await prisma.user.upsert({
      where: { email },
      update: {
        name: user.name,
        icNumber: user.icNumber,
        role: user.role,
        division: user.division,
        designation: user.designation,
        annualLeaveEntitlement: ANNUAL_ENTITLEMENT,
      },
      create: {
        ...user,
        email,
        passwordHash,
        annualLeaveEntitlement: ANNUAL_ENTITLEMENT,
      },
    });
  }

  for (const type of LEAVE_TYPES) {
    await prisma.leaveType.upsert({
      where: { name: type.name },
      update: { sortOrder: type.sortOrder, active: true },
      create: { ...type, active: true },
    });
  }

  const count = await prisma.user.count();
  const typeCount = await prisma.leaveType.count();
  console.log(
    `Seeded 6 demo users (password123 stored hashed). Users in database: ${count}; leave types: ${typeCount}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
