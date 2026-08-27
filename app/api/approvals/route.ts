import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, requireApiPermission, getPagination } from "@/lib/api";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "approvals.approve");
  if (error || !user) return error;

  const { page, pageSize, skip } = getPagination(req);
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "pending";
  const type = url.searchParams.get("type");

  const isManager = user.role === "MANAGER" || user.role === "DEPARTMENT_HEAD";
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "HR_ADMIN";

  // Steps this user can action: assigned to them directly, their role, or their department
  const stepsWhere = {
    AND: [
      { workflow: { status: "ACTIVE" } },
      {
        OR: [
          { assignedUserId: user.id },
          { assignedRole: user.role as never },
          {
            assigneeType: "DEPARTMENT",
            assignedDepartmentId: user.departmentId ?? "__none__",
          },
        ],
      },
    ],
  } as never;

  const activeSteps = await prisma.workflowStep.findMany({ where: stepsWhere, select: { id: true } });
  const stepIds = activeSteps.map((s) => s.id);

  let statusFilter;
  if (status === "pending") {
    statusFilter = { status: { in: ["PENDING_APPROVAL", "UNDER_REVIEW", "SUBMITTED"] } };
  } else if (status === "overdue") {
    statusFilter = { status: { in: ["PENDING_APPROVAL", "UNDER_REVIEW"] }, dueDate: { lt: new Date() } };
  } else if (status === "escalated") {
    statusFilter = { status: "ESCALATED" };
  } else {
    statusFilter = { status: status as never };
  }

  const where: Record<string, unknown> = {
    ...statusFilter,
    currentStepId: { in: stepIds.length ? stepIds : ["__none__"] },
  };
  if (type) where.type = type as never;
  if (!isManager && !isAdmin) {
    // Employees can see requests they created or requests assigned to them at approval steps
    where.OR = [{ requesterId: user.id }, { assignedUserId: user.id }];
  }

  const [total, requests] = await Promise.all([
    prisma.request.count({ where }),
    prisma.request.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true, departmentId: true } },
        department: { select: { id: true, name: true } },
        currentStep: true,
        workflow: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return jsonOk({ requests, total, page, pageSize });
}