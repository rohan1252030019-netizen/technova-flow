"use client";

import { useMemo } from "react";
import { Role } from "@/app/generated/prisma/client";
import { hasPermission, ROLE_PERMISSIONS, PermissionKey } from "@/lib/rbac";

/**
 * Client-side hook to check if a user has a specific permission.
 * Note: This is for UX/UI rendering only. Server-side checks are the true security boundary.
 */
export function usePermission(role: Role | string | undefined | null, permission: PermissionKey): boolean {
  return useMemo(() => {
    if (!role) return false;
    return hasPermission(role as Role, permission);
  }, [role, permission]);
}

/**
 * Client-side hook to check if a user has any of the specified roles.
 */
export function useRole(role: Role | string | undefined | null, ...allowedRoles: (Role | string)[]): boolean {
  return useMemo(() => {
    if (!role) return false;
    return allowedRoles.includes(role);
  }, [role, allowedRoles]);
}

/**
 * Client-side hook to get all permissions assigned to a role.
 */
export function useRolePermissions(role: Role | string | undefined | null): PermissionKey[] {
  return useMemo(() => {
    if (!role || !(role in ROLE_PERMISSIONS)) return [];
    return ROLE_PERMISSIONS[role as Role] || [];
  }, [role]);
}
