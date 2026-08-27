import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, parseError } from "@/lib/api";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "departments.view");
  if (error) return error;

  const departments = await prisma.department.findMany({
    include: {
      head: { select: { id: true, name: true, email: true } },
      _count: { select: { users: { where: { status: "ACTIVE" } }, requests: true, workflows: true } },
    },
    orderBy: { name: "asc" },
  });

  return jsonOk({ departments });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "departments.create");
  if (error || !user) return error;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";

  if (!name) return jsonError("Department name is required", 422);
  if (!code) return jsonError("Department code is required", 422);

  const existing = await prisma.department.findFirst({ where: { OR: [{ code }] } });
  if (existing) return jsonError("A department with this code already exists", 409);

  const created = await prisma.department.create({
    data: {
      name,
      code,
      description: body.description || null,
      headId: body.headId || null,
      isActive: true,
    },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "DEPARTMENT_CREATED",
    entityType: "Department",
    entityId: created.id,
    details: { name, code },
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ department: created }, "Department created", 201);
}