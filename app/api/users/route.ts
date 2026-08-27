import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, getPagination, getClientIp, parseError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { Role } from "@/app/generated/prisma/client";
import { validatePasswordStrength } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "users.view");
  if (error) return error;

  const { page, pageSize, skip } = getPagination(req);
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const departmentId = url.searchParams.get("departmentId");
  const role = url.searchParams.get("role");
  const status = url.searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { employeeId: { contains: q, mode: "insensitive" } },
      { designation: { contains: q, mode: "insensitive" } },
    ];
  }
  if (departmentId) where.departmentId = departmentId;
  if (role) where.role = role;
  if (status) where.status = status;

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return jsonOk({
    users: users.map((u) => ({ ...u, passwordHash: undefined })),
    total,
    page,
    pageSize,
  });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "users.create");
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role as Role;
  const employeeId = typeof body.employeeId === "string" ? body.employeeId.trim() : "";

  if (!name || name.length < 2) return jsonError("Name is required", 422);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonError("Valid email is required", 422);
  if (!employeeId) return jsonError("Employee ID is required", 422);
  if (!Object.values(Role).includes(role)) return jsonError("Invalid role", 422);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { employeeId }] },
  });
  if (existing) return jsonError("A user with this email or employee ID already exists", 409);

  const rawPassword = typeof body.password === "string" && body.password ? body.password : "Password@123";
  const pwdCheck = validatePasswordStrength(rawPassword);
  if (!pwdCheck.valid) return jsonError(pwdCheck.message || "Invalid password", 422);

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  const created = await prisma.user.create({
    data: {
      name,
      email,
      employeeId,
      passwordHash,
      role,
      designation: body.designation || null,
      phone: body.phone || null,
      departmentId: body.departmentId || null,
      managerId: body.managerId || null,
      joiningDate: body.joiningDate ? new Date(body.joiningDate) : null,
      status: "ACTIVE",
      avatarColor: "#6366f1",
    },
    include: { department: { select: { id: true, name: true } } },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "USER_CREATED",
    entityType: "User",
    entityId: created.id,
    details: { name: created.name, email: created.email, role: created.role },
    ip: await getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  return jsonOk({ user: { ...created, passwordHash: undefined } }, "Employee created", 201);
}