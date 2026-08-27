import { describe, it, expect } from "vitest";
import { hasPermission, ROLE_PERMISSIONS, ROLE_LABELS, PERMISSION_DEFINITIONS, PermissionKey } from "@/lib/rbac";
import type { Role } from "@/app/generated/prisma/client";
import { validatePasswordStrength } from "@/lib/utils";

describe("RBAC permission matrix", () => {
  it("defines exactly 30 permissions", () => {
    expect(PERMISSION_DEFINITIONS.length).toBe(30);
  });

  it("grants Super Admin every single permission in the system", () => {
    for (const def of PERMISSION_DEFINITIONS) {
      expect(hasPermission("SUPER_ADMIN", def.key)).toBe(true);
    }
  });

  it("grants HR Admin user and department management but not system settings or audit", () => {
    expect(hasPermission("HR_ADMIN", "users.create")).toBe(true);
    expect(hasPermission("HR_ADMIN", "users.update")).toBe(true);
    expect(hasPermission("HR_ADMIN", "users.deactivate")).toBe(true);
    expect(hasPermission("HR_ADMIN", "departments.create")).toBe(true);
    expect(hasPermission("HR_ADMIN", "departments.update")).toBe(true);
    expect(hasPermission("HR_ADMIN", "departments.delete")).toBe(false);
    expect(hasPermission("HR_ADMIN", "settings.manage")).toBe(false);
    expect(hasPermission("HR_ADMIN", "audit.view")).toBe(false);
    expect(hasPermission("HR_ADMIN", "workflows.create")).toBe(false);
  });

  it("grants Manager team approvals, tasks, requests and analytics", () => {
    expect(hasPermission("MANAGER", "approvals.approve")).toBe(true);
    expect(hasPermission("MANAGER", "approvals.delegate")).toBe(true);
    expect(hasPermission("MANAGER", "requests.escalate")).toBe(true);
    expect(hasPermission("MANAGER", "requests.cancel")).toBe(true);
    expect(hasPermission("MANAGER", "requests.view_all")).toBe(true);
    expect(hasPermission("MANAGER", "tasks.create")).toBe(true);
    expect(hasPermission("MANAGER", "analytics.view")).toBe(true);
    expect(hasPermission("MANAGER", "reports.export")).toBe(true);
    expect(hasPermission("MANAGER", "users.create")).toBe(false);
    expect(hasPermission("MANAGER", "settings.manage")).toBe(false);
  });

  it("grants Department Head department oversight but not user creation or settings", () => {
    expect(hasPermission("DEPARTMENT_HEAD", "approvals.approve")).toBe(true);
    expect(hasPermission("DEPARTMENT_HEAD", "requests.view_all")).toBe(true);
    expect(hasPermission("DEPARTMENT_HEAD", "tasks.create")).toBe(true);
    expect(hasPermission("DEPARTMENT_HEAD", "analytics.view")).toBe(true);
    expect(hasPermission("DEPARTMENT_HEAD", "reports.export")).toBe(false);
    expect(hasPermission("DEPARTMENT_HEAD", "users.create")).toBe(false);
    expect(hasPermission("DEPARTMENT_HEAD", "settings.manage")).toBe(false);
  });

  it("grants Finance approval and export rights", () => {
    expect(hasPermission("FINANCE", "approvals.approve")).toBe(true);
    expect(hasPermission("FINANCE", "approvals.delegate")).toBe(true);
    expect(hasPermission("FINANCE", "reports.export")).toBe(true);
    expect(hasPermission("FINANCE", "requests.view_all")).toBe(true);
    expect(hasPermission("FINANCE", "users.create")).toBe(false);
    expect(hasPermission("FINANCE", "tasks.create")).toBe(false);
  });

  it("strictly restricts Employee to personal workflows and requests", () => {
    expect(hasPermission("EMPLOYEE", "requests.create")).toBe(true);
    expect(hasPermission("EMPLOYEE", "requests.view")).toBe(true);
    expect(hasPermission("EMPLOYEE", "requests.cancel")).toBe(true);
    expect(hasPermission("EMPLOYEE", "tasks.view")).toBe(true);
    expect(hasPermission("EMPLOYEE", "tasks.update")).toBe(true);
    expect(hasPermission("EMPLOYEE", "notifications.view")).toBe(true);
    expect(hasPermission("EMPLOYEE", "users.view")).toBe(true);
    expect(hasPermission("EMPLOYEE", "departments.view")).toBe(true);
    expect(hasPermission("EMPLOYEE", "workflows.view")).toBe(true);

    // Forbidden for employee
    expect(hasPermission("EMPLOYEE", "requests.view_all")).toBe(false);
    expect(hasPermission("EMPLOYEE", "requests.assign")).toBe(false);
    expect(hasPermission("EMPLOYEE", "requests.escalate")).toBe(false);
    expect(hasPermission("EMPLOYEE", "approvals.approve")).toBe(false);
    expect(hasPermission("EMPLOYEE", "approvals.delegate")).toBe(false);
    expect(hasPermission("EMPLOYEE", "tasks.view_all")).toBe(false);
    expect(hasPermission("EMPLOYEE", "tasks.create")).toBe(false);
    expect(hasPermission("EMPLOYEE", "analytics.view")).toBe(false);
    expect(hasPermission("EMPLOYEE", "reports.export")).toBe(false);
    expect(hasPermission("EMPLOYEE", "audit.view")).toBe(false);
    expect(hasPermission("EMPLOYEE", "settings.manage")).toBe(false);
    expect(hasPermission("EMPLOYEE", "users.create")).toBe(false);
    expect(hasPermission("EMPLOYEE", "users.update")).toBe(false);
    expect(hasPermission("EMPLOYEE", "users.deactivate")).toBe(false);
    expect(hasPermission("EMPLOYEE", "users.assign_roles")).toBe(false);
    expect(hasPermission("EMPLOYEE", "departments.create")).toBe(false);
    expect(hasPermission("EMPLOYEE", "departments.update")).toBe(false);
    expect(hasPermission("EMPLOYEE", "departments.delete")).toBe(false);
    expect(hasPermission("EMPLOYEE", "workflows.create")).toBe(false);
    expect(hasPermission("EMPLOYEE", "workflows.update")).toBe(false);
    expect(hasPermission("EMPLOYEE", "workflows.publish")).toBe(false);
  });

  it("has a valid human-readable label for every role", () => {
    const roles: Role[] = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE", "EMPLOYEE"];
    for (const role of roles) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_PERMISSIONS[role]).toBeInstanceOf(Array);
    }
  });

  it("returns false gracefully for invalid or unknown permissions", () => {
    expect(hasPermission("SUPER_ADMIN", "nonexistent.perm" as PermissionKey)).toBe(false);
    expect(hasPermission("EMPLOYEE", "bogus.permission" as PermissionKey)).toBe(false);
  });
});

describe("Password strength validation", () => {
  it("rejects short or empty passwords", () => {
    expect(validatePasswordStrength("").valid).toBe(false);
    expect(validatePasswordStrength("Short1!").valid).toBe(false);
  });

  it("rejects passwords lacking uppercase, lowercase, numbers, or special chars", () => {
    expect(validatePasswordStrength("alllowercase1!").valid).toBe(false);
    expect(validatePasswordStrength("ALLUPPERCASE1!").valid).toBe(false);
    expect(validatePasswordStrength("NoNumberOrSpecial").valid).toBe(false);
    expect(validatePasswordStrength("NoSpecialChar123").valid).toBe(false);
  });

  it("accepts strong passwords meeting all complexity criteria", () => {
    expect(validatePasswordStrength("Password@123").valid).toBe(true);
    expect(validatePasswordStrength("Secure#2026_TechNova").valid).toBe(true);
  });
});