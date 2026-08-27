import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiUser } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiUser(req);
  if (error || !user) return error;

  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") || "all";
  
  const canViewAll = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"].includes(user.role);
  const departmentId = scope === "department" || !canViewAll ? (user.departmentId || undefined) : undefined;
  const whereDepartment = departmentId ? { departmentId } : undefined;

  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Run 4 highly optimized parallel queries
  const [
    totalEmployees,
    activeWorkflows,
    statusGroups,
    departments,
    departmentGroups,
    recentRequests,
    overdueTasks,
    slaBreaches,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.workflow.count({ where: { status: "ACTIVE" } }),
    prisma.request.groupBy({
      by: ["status"],
      where: whereDepartment,
      _count: true,
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
    }),
    prisma.request.groupBy({
      by: ["departmentId"],
      where: whereDepartment,
      _count: true,
    }),
    prisma.request.findMany({
      where: {
        ...whereDepartment,
        createdAt: { gte: monthAgo },
      },
      select: { createdAt: true, startedAt: true, completedAt: true },
      take: 1000,
    }),
    prisma.task.count({
      where: {
        status: { in: ["TODO", "IN_PROGRESS", "BLOCKED"] },
        dueDate: { lt: now },
        ...(canViewAll ? {} : { assigneeId: user.id }),
      },
    }),
    prisma.slaSnapshot.count({ where: { breached: true } }),
  ]);

  // Fast in-memory aggregation of status counts
  const statusMap: Record<string, number> = {};
  let totalRequests = 0;
  for (const s of statusGroups) {
    statusMap[s.status] = s._count;
    totalRequests += s._count;
  }

  const pendingApprovals = (statusMap["PENDING_APPROVAL"] || 0) + (statusMap["UNDER_REVIEW"] || 0) + (statusMap["SUBMITTED"] || 0);
  const completedRequests = statusMap["COMPLETED"] || 0;
  const rejectedRequests = statusMap["REJECTED"] || 0;
  const approvedCount = statusMap["APPROVED"] || 0;
  const escalatedCount = statusMap["ESCALATED"] || 0;
  const activeCount = statusMap["IN_PROGRESS"] || 0;

  // In-memory 30-day request trend
  const trendBuckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    trendBuckets.set(d.toISOString().slice(0, 10), 0);
  }
  let totalProcessingMs = 0;
  let completedCountForAvg = 0;

  for (const r of recentRequests) {
    const dateKey = new Date(r.createdAt).toISOString().slice(0, 10);
    if (trendBuckets.has(dateKey)) {
      trendBuckets.set(dateKey, (trendBuckets.get(dateKey) || 0) + 1);
    }
    if (r.startedAt && r.completedAt) {
      totalProcessingMs += new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime();
      completedCountForAvg++;
    }
  }

  const requestTrend = Array.from(trendBuckets.entries()).map(([date, count]) => ({ date, count }));

  // In-memory department mapping
  const deptNameMap = new Map<string, string>();
  for (const d of departments) {
    deptNameMap.set(d.id, d.name);
  }

  const byDepartment = departmentGroups.map((g) => ({
    name: (g.departmentId ? deptNameMap.get(g.departmentId) : null) || "Unassigned",
    count: g._count,
  }));

  const byStatus = statusGroups.map((g) => ({
    status: g.status,
    count: g._count,
  }));

  const avgProcessingHours = completedCountForAvg > 0 ? Math.round(totalProcessingMs / completedCountForAvg / 3600000) : 0;
  const completionRate = totalRequests > 0 ? Math.round(((completedRequests + approvedCount) / totalRequests) * 100) : 0;

  const data = {
    stats: {
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
      avgProcessingHours,
      slaBreaches,
      completionRate,
    },
    requestTrend,
    byDepartment,
    byStatus,
    scope,
  };

  return jsonOk(data);
}