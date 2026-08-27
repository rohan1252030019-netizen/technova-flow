import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiPermission } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "analytics.view");
  if (error) return error;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "all";
  const departmentId = scope === "department" ? user.departmentId : undefined;
  const whereDept = departmentId ? { departmentId } : undefined;

  const now = new Date();

  const [total, completed, rejected, escalated, breached, allClosed, byType, deptPerformance, employeePerformance] = await Promise.all([
    prisma.request.count({ where: whereDept }),
    prisma.request.count({ where: { ...whereDept, status: { in: ["COMPLETED", "APPROVED"] } } }),
    prisma.request.count({ where: { ...whereDept, status: "REJECTED" } }),
    prisma.request.count({ where: { ...whereDept, status: "ESCALATED" } }),
    prisma.slaSnapshot.count({ where: { breached: true } }),
    prisma.request.findMany({
      where: { ...whereDept, completedAt: { not: null }, startedAt: { not: null } },
      select: { startedAt: true, completedAt: true, createdAt: true },
    }),
    prisma.request.groupBy({ by: ["type"], where: whereDept, _count: true }),
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { requests: true } },
      },
    }).then((depts) =>
      Promise.all(
        depts.map(async (d) => {
          const [reqCount, done, pending, overdue] = await Promise.all([
            prisma.request.count({ where: { departmentId: d.id } }),
            prisma.request.count({ where: { departmentId: d.id, status: { in: ["COMPLETED", "APPROVED"] } } }),
            prisma.request.count({ where: { departmentId: d.id, status: { in: ["PENDING_APPROVAL", "UNDER_REVIEW", "SUBMITTED", "IN_PROGRESS"] } } }),
            prisma.request.count({ where: { departmentId: d.id, dueDate: { lt: now }, status: { in: ["PENDING_APPROVAL", "UNDER_REVIEW", "IN_PROGRESS"] } } }),
          ]);
          return {
            name: d.name,
            requests: reqCount,
            completed: done,
            pending,
            overdue,
            completionRate: reqCount ? Math.round((done / reqCount) * 100) : 0,
          };
        })
      )
    ),
    prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["EMPLOYEE", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"] } },
      select: { id: true, name: true, employeeId: true, designation: true, departmentId: true },
      take: 50,
    }).then((users) =>
      Promise.all(
        users.map(async (u) => {
          const tasks = await prisma.task.findMany({ where: { assigneeId: u.id }, select: { status: true, completedAt: true, createdAt: true } });
          const done = tasks.filter((t) => t.status === "COMPLETED");
          const avgMs = done.length
            ? done.reduce((acc, t) => acc + (t.completedAt ? new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime() : 0), 0) / done.length
            : 0;
          return {
            name: u.name,
            employeeId: u.employeeId,
            designation: u.designation,
            totalTasks: tasks.length,
            completed: done.length,
            inProgress: tasks.filter((t) => t.status === "IN_PROGRESS").length,
            pending: tasks.filter((t) => ["TODO", "BLOCKED"].includes(t.status)).length,
            avgCompletionHours: Math.round(avgMs / 3600000),
          };
        })
      )
    ),
  ]);

  const totalMs = allClosed.reduce((acc, r) => acc + (new Date(r.completedAt!).getTime() - new Date(r.startedAt!).getTime()), 0);
  const avgCompletionHours = allClosed.length ? Math.round(totalMs / allClosed.length / 3600000) : 0;
  const rejectionRate = total ? Math.round((rejected / total) * 100) : 0;
  const breachRate = total ? Math.round((breached / total) * 100) : 0;

  const slaSnapshotCount = await prisma.slaSnapshot.count({ where: whereDept ? { request: { departmentId: whereDept.departmentId } } : undefined });
  const slaBreachRate = slaSnapshotCount ? Math.round((breached / slaSnapshotCount) * 100) : 0;

  return jsonOk({
    workflowPerformance: {
      totalRequests: total,
      completedRequests: completed,
      rejectedRequests: rejected,
      escalatedRequests: escalated,
      avgCompletionHours,
      rejectionRate,
      slaBreachRate,
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
    },
    departmentPerformance: deptPerformance,
    employeePerformance: employeePerformance.sort((a, b) => b.completed - a.completed).slice(0, 10),
    scope,
  });
}