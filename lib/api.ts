import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getSessionUser } from "@/lib/auth";
import { hasPermission, PermissionKey } from "@/lib/rbac";

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ success: false, message, details }, { status });
}

export function jsonOk(data: unknown, message?: string, status = 200) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function parseError(e: unknown) {
  if (e instanceof ZodError) {
    return jsonError("Validation failed", 422, e.flatten().fieldErrors);
  }
  const msg = e instanceof Error ? e.message : "Something went wrong";
  if (msg.includes("Unique constraint")) return jsonError("Record already exists", 409);
  if (msg.includes("not found")) return jsonError(msg, 404);
  return jsonError("Internal server error", 500);
}

export async function requireApiUser(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, error: jsonError("Authentication required", 401) };
  }
  return { user, error: null };
}

export async function requireApiPermission(req: NextRequest, permission: PermissionKey) {
  const { user, error } = await requireApiUser(req);
  if (error || !user) return { user, error };
  if (!hasPermission(user.role, permission)) {
    return {
      user,
      error: jsonError("You are not authorized to perform this action.", 403),
    };
  }
  return { user, error: null };
}

export async function getClientIp(req: NextRequest) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function getPagination(req: NextRequest) {
  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 20)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}