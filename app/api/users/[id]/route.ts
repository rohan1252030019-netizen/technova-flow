import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiUser, requireApiPermission, parseError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { Role, UserStatus } from "@/app/generated/prisma/client";

async function canViewProfile(actor: { id: string; role: Role }, targetId: string, actorDeptId: string | null, actorManagerId: string | null) {
  if (actor.role === "SUPER_ADMIN" || actor.role === "HR_ADMIN") return true;
  if (actor.id === targetId) return true;
  if (actor.role === "MANAGER") {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { managerId: true, departmentId: true } });
    if (target?.managerId === actor.id) return true;
  }
  if (actor.role === "DEPARTMENT_HEAD") {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { departmentId: true } });
    if (target?.departmentId === actorDeptId) return true;
  }
  return false;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiUser(req);
  if (error || !user) return error;

  const { id } = await params;

  const allowed = await canViewProfile(user, id, user.departmentId, user.managerId);
  if (!allowed) return jsonError("You are not authorized to view this profile.", 403);

  const profile = await prisma.user.findUnique({
    where: { id },
    include: {
      department: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, email: true } },
      reports: { select: { id: true, name: true, employeeId: true, designation: true } },
    },
  });
  if (!profile) return jsonError("Employee not found", 404);

  const [tasks, requests, approvals] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.request.findMany({
      where: { requesterId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.approval.findMany({
      where: { approverId: id },
      include: { request: { select: { id: true, requestNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return jsonOk({
    profile: { ...profile, passwordHash: undefined },
    tasks,
    requests,
    approvals,
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "users.update");
  if (error || !user) return error;

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError("Employee not found", 404);

  if (target.role === "SUPER_ADMIN" && target.id !== user.id && user.role !== "SUPER_ADMIN") {
    return jsonError("You cannot modify a Super Admin account.", 403);
  }

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim().length >= 2) data.name = body.name.trim();
  if (typeof body.phone === "string") data.phone = body.phone.trim() || null;
  if (typeof body.designation === "string") data.designation = body.designation.trim() || null;
  if (typeof body.departmentId === "string") data.departmentId = body.departmentId || null;
  if (typeof body.managerId === "string") data.managerId = body.managerId || null;
  if (body.joiningDate) data.joiningDate = new Date(body.joiningDate);
  if (body.role && Object.values(Role).includes(body.role as Role)) {
    if (user.role === "SUPER_ADMIN" || user.role === "HR_ADMIN") {
      data.role = body.role;
    }
  }
  if (body.status && Object.values(UserStatus).includes(body.status as UserStatus)) {
    data.status = body.status;
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    include: { department: { select: { id: true, name: true } }, manager: { select: { id: true, name: true } } },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "USER_UPDATED",
    entityType: "User",
    entityId: id,
    details: { fields: Object.keys(data), roleChanged: "role" in data },
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ user: { ...updated, passwordHash: undefined } }, "Employee updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "users.deactivate");
  if (error || !user) return error;

  const { id } = await params;
  if (id === user.id) return jsonError("You cannot deactivate your own account.", 400);

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return jsonError("Employee not found", 404);

  if (target.role === "SUPER_ADMIN") return jsonError("You cannot deactivate a Super Admin account.", 403);

  await prisma.user.update({
    where: { id },
    data: { status: "INACTIVE" },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "USER_DEACTIVATED",
    entityType: "User",
    entityId: id,
    details: { name: target.name, email: target.email },
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk(null, "Employee deactivated");
}