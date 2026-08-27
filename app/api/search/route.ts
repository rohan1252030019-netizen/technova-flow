import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiPermission } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "requests.view");
  if (error || !user) return error;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return jsonOk({ results: [] });

  const limit = 6;
  const canViewAll = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"].includes(user.role);

  const [employees, requests, tasks, departments, workflows] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { employeeId: { contains: q, mode: "insensitive" } },
          { designation: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, employeeId: true, designation: true, departmentId: true },
      take: limit,
    }),
    prisma.request.findMany({
      where: {
        AND: [
          {
            OR: [
              { requestNumber: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
            ],
          },
          // Employees only see their own requests in search
          ...(canViewAll ? [] : [{ requesterId: user.id }]),
        ],
      },
      select: { id: true, requestNumber: true, title: true, status: true },
      take: limit,
    }),
    prisma.task.findMany({
      where: {
        AND: [
          { title: { contains: q, mode: "insensitive" } },
          // Employees only see their own tasks in search
          ...(canViewAll ? [] : [{ assigneeId: user.id }]),
        ],
      },
      select: { id: true, title: true, status: true },
      take: limit,
    }),
    prisma.department.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, code: true },
      take: limit,
    }),
    prisma.workflow.findMany({
      where: { name: { contains: q, mode: "insensitive" } },
      select: { id: true, name: true, status: true },
      take: limit,
    }),
  ]);

  const results = [
    ...employees.map((e) => ({
      type: "employee",
      id: e.id,
      label: e.name,
      sub: `${e.employeeId} · ${e.designation || "Employee"}`,
    })),
    ...requests.map((r) => ({
      type: "request",
      id: r.id,
      label: `${r.requestNumber} — ${r.title}`,
      sub: r.status.replace(/_/g, " "),
    })),
    ...tasks.map((t) => ({
      type: "task",
      id: t.id,
      label: t.title,
      sub: t.status.replace(/_/g, " "),
    })),
    ...departments.map((d) => ({
      type: "department",
      id: d.id,
      label: d.name,
      sub: d.code,
    })),
    ...workflows.map((w) => ({
      type: "workflow",
      id: w.id,
      label: w.name,
      sub: w.status,
    })),
  ];

  return jsonOk({ results: results.slice(0, 12) });
}