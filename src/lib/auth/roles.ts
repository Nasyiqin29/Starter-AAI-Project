// The four roles, their home routes and the fixed message strings —
// one place to look up "who may open what" (design §5, Reference A).

export const ROLES = ["Employee", "Supervisor", "HR", "Admin"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export const ROLE_HOME: Record<Role, string> = {
  Employee: "/employee",
  Supervisor: "/supervisor",
  HR: "/hr",
  Admin: "/admin",
};

// Exact words the acceptance checklist tests against (design Reference A).
export const MESSAGES = {
  wrongFormat: "Use your @budiman.com work email",
  invalidCredentials: "Invalid email or password",
  locked: "Too many failed attempts. Try again in 15 minutes.",
  forbidden: "You are not allowed to view that page",
  loggedOut: "You have been logged out",
} as const;
