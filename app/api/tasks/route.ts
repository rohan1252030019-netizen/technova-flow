import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonOk, jsonError, requireApiPermission, getPagination, getClientIp } from "@/lib/api";
import { audit } from "@/lib/audit";
import { notify } from "@/lib/notifications";
import { TaskStatus, TaskPriority } from "@/app/generated/prisma/client";

export async function GET(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "tasks.view");
  if (error) return error;

  const { page, pageSize, skip } = getPagination(req);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const priority = url.searchParams.get("priority");
  const assigneeId = url.searchParams.get("assigneeId");
  const q = url.searchParams.get("q");
  const mine = url.searchParams.get("mine") === "true";
  const view = url.searchParams.get("view") || "list";

  const canViewAll = ["SUPER_ADMIN", "HR_ADMIN", "MANAGER", "DEPARTMENT_HEAD", "FINANCE"].includes(user.role);

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assigneeId) where.assigneeId = assigneeId;
  if (q) where.title = { contains: q, mode: "insensitive" };
  if (mine || !canViewAll) where.assigneeId = user.id;

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, avatarColor: true } },
        department: { select: { id: true, name: true } },
        request: { select: { id: true, requestNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
  ]);

  return jsonOk({ tasks, total, page, pageSize, view });
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireApiPermission(req, "tasks.create");
  if (error || !user) return error;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("Invalid request body", 400);

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length < 3) return jsonError("Task title must be at least 3 characters", 422);
  if (!body.assigneeId) return jsonError("Assignee is required", 422);

  const assignee = await prisma.user.findUnique({ where: { id: body.assigneeId } });
  if (!assignee) return jsonError("Assignee not found", 404);

  const task = await prisma.task.create({
    data: {
      title,
      description: body.description || null,
      assigneeId: body.assigneeId,
      departmentId: body.departmentId || assignee.departmentId || null,
      priority: (body.priority as TaskPriority) || "MEDIUM",
      status: (body.status as TaskStatus) || "TODO",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      requestId: body.requestId || null,
      workflowId: body.workflowId || null,
      createdById: user.id,
    },
    include: { assignee: { select: { id: true, name: true } } },
  });

  await audit({
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: task.id,
    details: { title, assignee: assignee.name },
    ip: await getClientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  await notify({
    userId: assignee.id,
    type: "TASK_ASSIGNED",
    title: "New task assigned",
    body: title,
    link: `/tasks/${task.id}`,
  });

  return jsonOk({ task }, "Task created", 201);
}