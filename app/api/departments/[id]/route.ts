import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "departments.view");
  if (error) return error;

  const { id } = await params;
  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      head: { select: { id: true, name: true, email: true, designation: true } },
      users: {
        where: { status: "ACTIVE" },
        select: { id: true, name: true, email: true, employeeId: true, designation: true, role: true },
        orderBy: { name: "asc" },
      },
      workflows: { select: { id: true, name: true, status: true, trigger: true } },
    },
  });
  if (!department) return jsonError("Department not found", 404);

  const [requests, tasks] = await Promise.all([
    prisma.request.groupBy({
      by: ["status"],
      where: { departmentId: id },
      _count: true,
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { departmentId: id },
      _count: true,
    }),
  ]);

  return jsonOk({ department, requestStats: requests, taskStats: tasks });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "departments.update");
  if (error || !user) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const existing = await prisma.department.findUnique({ where: { id } });
  if (!existing) return jsonError("Department not found", 404);

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description.trim() || null;
  if ("headId" in body) data.headId = body.headId || null;
  if ("isActive" in body) data.isActive = Boolean(body.isActive);

  const updated = await prisma.department.update({ where: { id }, data });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "DEPARTMENT_UPDATED",
    entityType: "Department",
    entityId: id,
    details: { fields: Object.keys(data) },
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ department: updated }, "Department updated");
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireApiPermission(req, "departments.delete");
  if (error || !user) return error;

  const { id } = await params;
  const existing = await prisma.department.findUnique({
    where: { id },
    include: { _count: { select: { users: true, requests: true, workflows: true } } },
  });
  if (!existing) return jsonError("Department not found", 404);

  if (existing._count.users > 0 || existing._count.requests > 0 || existing._count.workflows > 0) {
    return jsonError(
      "Cannot delete department with associated users, requests, or workflows. Deactivate it instead.",
      409
    );
  }

  await prisma.department.delete({ where: { id } });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "DEPARTMENT_DELETED",
    entityType: "Department",
    entityId: id,
    details: { name: existing.name, code: existing.code },
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk(null, "Department deleted");
}