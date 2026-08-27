import { Role } from "@/app/generated/prisma/client";

export type PermissionKey =
  | "users.view"
  | "users.create"
  | "users.update"
  | "users.deactivate"
  | "users.assign_roles"
  | "departments.view"
  | "departments.create"
  | "departments.update"
  | "departments.delete"
  | "workflows.view"
  | "workflows.create"
  | "workflows.update"
  | "workflows.publish"
  | "requests.view"
  | "requests.view_all"
  | "requests.create"
  | "requests.assign"
  | "requests.cancel"
  | "requests.escalate"
  | "approvals.approve"
  | "approvals.delegate"
  | "tasks.view"
  | "tasks.view_all"
  | "tasks.create"
  | "tasks.update"
  | "analytics.view"
  | "reports.export"
  | "audit.view"
  | "settings.manage"
  | "notifications.view";

export const PERMISSION_DEFINITIONS: { key: PermissionKey; name: string; module: string }[] = [
  { key: "users.view", name: "View Users", module: "Users" },
  { key: "users.create", name: "Create Users", module: "Users" },
  { key: "users.update", name: "Update Users", module: "Users" },
  { key: "users.deactivate", name: "Deactivate Users", module: "Users" },
  { key: "users.assign_roles", name: "Assign Roles", module: "Users" },
  { key: "departments.view", name: "View Departments", module: "Departments" },
  { key: "departments.create", name: "Create Departments", module: "Departments" },
  { key: "departments.update", name: "Update Departments", module: "Departments" },
  { key: "departments.delete", name: "Delete Departments", module: "Departments" },
  { key: "workflows.view", name: "View Workflows", module: "Workflows" },
  { key: "workflows.create", name: "Create Workflows", module: "Workflows" },
  { key: "workflows.update", name: "Update Workflows", module: "Workflows" },
  { key: "workflows.publish", name: "Publish Workflows", module: "Workflows" },
  { key: "requests.view", name: "View Own Requests", module: "Requests" },
  { key: "requests.view_all", name: "View All Requests", module: "Requests" },
  { key: "requests.create", name: "Create Requests", module: "Requests" },
  { key: "requests.assign", name: "Assign Requests", module: "Requests" },
  { key: "requests.cancel", name: "Cancel Requests", module: "Requests" },
  { key: "requests.escalate", name: "Escalate Requests", module: "Requests" },
  { key: "approvals.approve", name: "Approve / Reject", module: "Approvals" },
  { key: "approvals.delegate", name: "Delegate Approvals", module: "Approvals" },
  { key: "tasks.view", name: "View Own Tasks", module: "Tasks" },
  { key: "tasks.view_all", name: "View All Tasks", module: "Tasks" },
  { key: "tasks.create", name: "Create Tasks", module: "Tasks" },
  { key: "tasks.update", name: "Update Tasks", module: "Tasks" },
  { key: "analytics.view", name: "View Analytics", module: "Analytics" },
  { key: "reports.export", name: "Export Reports", module: "Reports" },
  { key: "audit.view", name: "View Audit Logs", module: "Audit" },
  { key: "settings.manage", name: "Manage Settings", module: "Settings" },
  { key: "notifications.view", name: "View Notifications", module: "Notifications" },
];

export const ROLE_PERMISSIONS: Record<Role, PermissionKey[]> = {
  SUPER_ADMIN: PERMISSION_DEFINITIONS.map((p) => p.key),
  HR_ADMIN: [
    "users.view",
    "users.create",
    "users.update",
    "users.deactivate",
    "users.assign_roles",
    "departments.view",
    "departments.create",
    "departments.update",
    "workflows.view",
    "requests.view",
    "requests.view_all",
    "requests.create",
    "requests.assign",
    "requests.escalate",
    "approvals.approve",
    "approvals.delegate",
    "tasks.view",
    "tasks.view_all",
    "tasks.create",
    "tasks.update",
    "analytics.view",
    "reports.export",
    "notifications.view",
  ],
  MANAGER: [
    "users.view",
    "departments.view",
    "workflows.view",
    "requests.view",
    "requests.view_all",
    "requests.create",
    "requests.assign",
    "requests.cancel",
    "requests.escalate",
    "approvals.approve",
    "approvals.delegate",
    "tasks.view",
    "tasks.view_all",
    "tasks.create",
    "tasks.update",
    "analytics.view",
    "reports.export",
    "notifications.view",
  ],
  DEPARTMENT_HEAD: [
    "departments.view",
    "workflows.view",
    "requests.view",
    "requests.view_all",
    "requests.create",
    "requests.assign",
    "requests.escalate",
    "approvals.approve",
    "tasks.view",
    "tasks.view_all",
    "tasks.create",
    "tasks.update",
    "analytics.view",
    "notifications.view",
  ],
  FINANCE: [
    "departments.view",
    "workflows.view",
    "requests.view",
    "requests.view_all",
    "requests.create",
    "requests.escalate",
    "approvals.approve",
    "approvals.delegate",
    "tasks.view",
    "tasks.view_all",
    "tasks.update",
    "analytics.view",
    "reports.export",
    "notifications.view",
  ],
  EMPLOYEE: [
    "users.view",
    "departments.view",
    "workflows.view",
    "requests.view",
    "requests.create",
    "requests.cancel",
    "tasks.view",
    "tasks.update",
    "notifications.view",
  ],
};

export function hasPermission(role: Role, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  HR_ADMIN: "HR Admin",
  MANAGER: "Manager",
  DEPARTMENT_HEAD: "Department Head",
  FINANCE: "Finance",
  EMPLOYEE: "Employee",
};