import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk } from "@/lib/api";
import { requireApiPermission } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "analytics.view");
  if (error) return error;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "all";
  const departmentId = scope === "department" ? user.departmentId : undefined;

  const whereDepartment = departmentId ? { departmentId } : undefined;

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalEmployees,
    activeWorkflows,
    totalRequests,
    pendingApprovals,
    completedRequests,
    rejectedRequests,
    overdueTasks,
    approvedCount,
    escalatedCount,
    activeCount,
    requestTrend,
    byDepartment,
    byStatus,
    avgProcessingMs,
    slaBreaches,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.workflow.count({ where: { status: "ACTIVE" } }),
    prisma.request.count({ where: whereDepartment }),
    prisma.request.count({ where: { ...whereDepartment, status: { in: ["PENDING_APPROVAL", "UNDER_REVIEW", "SUBMITTED"] } } }),
    prisma.request.count({ where: { ...whereDepartment, status: "COMPLETED" } }),
    prisma.request.count({ where: { ...whereDepartment, status: "REJECTED" } }),
    prisma.task.count({ where: { status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] }, dueDate: { lt: now } } }),
    prisma.request.count({ where: { ...whereDepartment, status: "APPROVED" } }),
    prisma.request.count({ where: { ...whereDepartment, status: "ESCALATED" } }),
    prisma.request.count({ where: { ...whereDepartment, status: "IN_PROGRESS" } }),
    prisma.request.groupBy({
      by: ["createdAt"],
      where: { ...whereDepartment, createdAt: { gte: monthAgo } },
      _count: true,
    }).then((rows) => {
      const buckets = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        buckets.set(d.toISOString().slice(0, 10), 0);
      }
      for (const r of rows) {
        const key = new Date(r.createdAt).toISOString().slice(0, 10);
        if (buckets.has(key)) buckets.set(key, buckets.get(key)! + r._count);
      }
      return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
    }),
    prisma.request.groupBy({
      by: ["departmentId"],
      where: whereDepartment,
      _count: true,
    }).then((rows) => Promise.all(rows.map(async (r) => {
      const dept = r.departmentId
        ? await prisma.department.findUnique({ where: { id: r.departmentId }, select: { name: true } })
        : null;
      return { name: dept?.name || "Unassigned", count: r._count };
    }))),
    prisma.request.groupBy({
      by: ["status"],
      where: whereDepartment,
      _count: true,
    }).then((rows) => rows.map((r) => ({ status: r.status, count: r._count }))),
    prisma.request.findMany({
      where: { ...whereDepartment, completedAt: { not: null }, startedAt: { not: null } },
      select: { startedAt: true, completedAt: true },
    }).then((rows) => {
      if (rows.length === 0) return 0;
      const total = rows.reduce((acc, r) => acc + (new Date(r.completedAt!).getTime() - new Date(r.startedAt!).getTime()), 0);
      return total / rows.length;
    }),
    prisma.slaSnapshot.count({ where: { breached: true } }),
  ]);

  const pendingCount = pendingApprovals;

  const data = {
    stats: {
      totalEmployees,
      activeWorkflows,
      totalRequests,
      pendingApprovals: pendingCount,
      completedRequests,
      rejectedRequests,
      overdueTasks,
      approvedCount,
      escalatedCount,
      activeCount,
      avgProcessingHours: Math.round(avgProcessingMs / 3600000),
      slaBreaches,
      completionRate: totalRequests
        ? Math.round(((completedRequests + approvedCount) / totalRequests) * 100)
        : 0,
    },
    requestTrend,
    byDepartment,
    byStatus,
    scope,
  };

  return jsonOk(data);
}